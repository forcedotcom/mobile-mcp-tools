/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { ModelConfig } from '../../src/llmclient/modelConfig.js';
import { StreamType } from '../../src/llmclient/llmClient.js';
import { mockConfig } from '../testUtils.js';

// Mock TextDecoderStream
class MockTextDecoderStream {
  readonly encoding: string = 'utf-8';
  readonly fatal: boolean = false;
  readonly ignoreBOM: boolean = false;
  readonly readable: ReadableStream;
  readonly writable: WritableStream;

  constructor() {
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        const decoder = new TextDecoder();
        const text = decoder.decode(chunk);
        controller.enqueue(text);
      },
    });
    this.readable = readable;
    this.writable = writable;
  }
}

global.TextDecoderStream = MockTextDecoderStream as unknown as typeof TextDecoderStream;

// Create a concrete class for testing
class TestModel extends LlmClient {
  constructor(config: ModelConfig) {
    super(config);
  }
}

describe('BaseModel', () => {
  let model: TestModel;

  beforeEach(() => {
    model = new TestModel(mockConfig);
    vi.clearAllMocks();
  });

  describe('callLLM', () => {
    it('should make a successful API call and return response only one event', async () => {
      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('event: generation\n{"generations":[{"text":"chunk1"}]}')
            );
            controller.close();
          },
        }),
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await model.callLLM('test prompt');

      expect(global.fetch).toHaveBeenCalledWith('https://test-api.com/generations/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LLM-Provider': 'test-provider',
          'X-Sfdc-Core-Tenant-Id': 'test-tenant',
          'X-Client-Feature-Id': 'test-feature',
          Authorization: 'API_KEY test-api-key',
        },
        body: expect.any(String),
      });

      expect(result).toBe('chunk1');
    });

    it('should make a successful API call and return response multiple events', async () => {
      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(`
              event: generation
              data: {"generations":[{"text":"chunk1"}]}
              event: generation
              data: {"generations":[{"text":"chunk2"}]}
              `)
            );
            controller.close();
          },
        }),
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      const result = await model.callLLM('test prompt');

      expect(global.fetch).toHaveBeenCalledWith('https://test-api.com/generations/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LLM-Provider': 'test-provider',
          'X-Sfdc-Core-Tenant-Id': 'test-tenant',
          'X-Client-Feature-Id': 'test-feature',
          Authorization: 'API_KEY test-api-key',
        },
        body: expect.any(String),
      });

      expect(result).toBe('chunk1chunk2');
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      await expect(model['callLLM']('test prompt')).rejects.toThrow('Failed the http post call');
    });

    it('should throw error when response body is missing', async () => {
      const mockResponse = {
        ok: true,
        body: null,
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

      await expect(model['callLLM']('test prompt')).rejects.toThrow('Failed the http post call');
    });

    it('should handle stream errors', async () => {
      const mockResponse = {
        body: new ReadableStream({
          start(controller) {
            controller.error(new Error('Stream error'));
          },
        }),
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);
      await expect(model.callLLM('test prompt')).rejects.toThrow();
    });
  });

  describe('streamToText', () => {
    it('should convert stream to text', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('event: generation\n{"generations":[{"text":"test data"}]}')
          );
          controller.close();
        },
      });

      const result = await model.streamToText(mockStream);
      expect(result).toBe('test data');
    });

    it('should handle empty stream', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const result = await model.streamToText(mockStream);
      expect(result).toBe('');
    });

    it('should handle multiple chunks', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('event: generation\n{"generations":[{"text":"chunk1"}]}')
          );
          controller.enqueue(
            new TextEncoder().encode('event: generation\n{"generations":[{"text":"chunk2"}]}')
          );
          controller.close();
        },
      });

      const result = await model.streamToText(mockStream);
      expect(result).toBe('chunk1chunk2');
    });
  });

  describe('processStream', () => {
    it('should process one generation event', () => {
      const value = 'event: generation\ndata: {"generations":[{"text":"test"}]}';
      const result = model.processStream(value, StreamType.GENERATION);
      expect(result).toEqual({ generations: [{ text: 'test' }] });
    });

    // The LLM generations/stream endpoint returns a stream.
    // sometime the steam.read() could return multiple 'generation' events, this test verifies that
    // the processStream method could handle such scenario.
    it('should process multiple generation events', () => {
      const value = `
  event: generation
  data: {"generations":[{"text":"chunk1"}]}   
  event: generation
  data: {"generations":[{"text":"chunk2"}]}   
  `;
      const result = model.processStream(value, StreamType.GENERATION);
      expect(result).toEqual({
        generations: [{ text: 'chunk1' }, { text: 'chunk2' }],
      });
    });

    it('should process error event', () => {
      const value = 'event: error\n{"errorCode":"test-error"}';
      const result = model.processStream(value, StreamType.ERROR);
      expect(result).toEqual({ errorCode: 'test-error' });
    });

    it('should return undefined for invalid stream type', () => {
      const value = 'invalid stream data';
      const result = model.processStream(value, StreamType.GENERATION);
      expect(result).toBeUndefined();
    });

    it('throw error when invalid json', () => {
      const value = 'event: generation\n data:{i}';
      expect(() => model.processStream(value, StreamType.GENERATION)).toThrow(/JSON at position 1/);
    });
  });
});
