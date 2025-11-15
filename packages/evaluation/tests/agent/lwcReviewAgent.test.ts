/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { LwcReviewAgent } from '../../src/agent/lwcReviewAgent.js';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { MobileWebMcpClient } from '../../src/mcpclient/mobileWebMcpClient.js';
import { LwcCodeType } from '../../src/schema/schema.js';

// Mock the dependencies
vi.mock('../../src/mcpclient/mobileWebMcpClient.js');
vi.mock('../../src/llmclient/llmClient.js');
vi.mock('../../src/utils/responseUtils.js', () => ({
  getJsonResponse: vi.fn((response: string) => response),
}));

describe('LwcReviewAgent', () => {
  let reviewAgent: LwcReviewAgent;
  let mockMcpClient: MobileWebMcpClient;
  let mockLlmClient: LlmClient;

  const mockComponent: LwcCodeType = {
    name: 'testComponent',
    namespace: 'c',
    html: [
      {
        path: 'testComponent.html',
        content: '<template><div>Test Component</div></template>',
      },
    ],
    js: [
      {
        path: 'testComponent.js',
        content: 'export default class TestComponent extends LightningElement {}',
      },
    ],
    css: [],
    jsMetaXml: {
      path: 'testComponent.js-meta.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
    },
  };

  const mockGuidanceResponse = {
    content: [
      {
        text: JSON.stringify({
          reviewInstructions: [
            {
              expertReviewerName: 'Mobile Compatibility Expert',
              supportedFileTypes: ['JS', 'HTML'],
              grounding: 'Mobile-specific considerations',
              request: 'Review for mobile compatibility issues',
              expectedResponseFormat: {
                schema: {},
                inputValues: {
                  expertReviewerName: 'Mobile Compatibility Expert',
                },
              },
            },
          ],
          orchestrationInstructions: 'Test orchestration instructions',
        }),
      },
    ],
  };

  const mockAnalysisResponse = {
    content: [
      {
        text: JSON.stringify({
          analysisResults: [
            {
              expertReviewerName: 'Offline Analysis Expert',
              issues: [
                {
                  type: 'Performance Issue',
                  description: 'Component may have performance issues on mobile',
                  intentAnalysis: 'Developer intended to create a responsive component',
                  suggestedAction: 'Optimize component for mobile performance',
                  code: 'export default class TestComponent extends LightningElement {}',
                  location: {
                    startLine: 1,
                    endLine: 1,
                    startColumn: 1,
                    endColumn: 50,
                  },
                },
              ],
            },
          ],
          orchestrationInstructions: 'Test analysis orchestration instructions',
        }),
      },
    ],
  };

  const mockLlmResponse = JSON.stringify([
    {
      type: 'Code Quality Issue',
      description: 'Component lacks proper error handling',
      intentAnalysis: 'Developer focused on basic functionality',
      suggestedAction: 'Add proper error handling and validation',
      code: 'export default class TestComponent extends LightningElement {}',
      location: {
        startLine: 1,
        endLine: 1,
        startColumn: 1,
        endColumn: 50,
      },
    },
  ]);

  beforeEach(() => {
    // Create mock instances
    mockMcpClient = {
      callTool: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      listTools: vi.fn(),
    } as unknown as MobileWebMcpClient;

    mockLlmClient = {
      callLLM: vi.fn(),
    } as unknown as LlmClient;

    // Create the review agent with mocked dependencies
    reviewAgent = new LwcReviewAgent(mockMcpClient, mockLlmClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('reviewLwcComponent', () => {
    it('should successfully review an LWC component and return combined issues', async () => {
      // Mock the guidance tool call
      (mockMcpClient.callTool as vi.Mock)
        .mockResolvedValueOnce(mockGuidanceResponse) // First call for guidance
        .mockResolvedValueOnce(mockAnalysisResponse); // Second call for analysis

      // Mock the LLM call
      (mockLlmClient.callLLM as vi.Mock).mockResolvedValue(mockLlmResponse);

      const result = await reviewAgent.reviewLwcComponent(mockComponent);

      // Verify the result contains both guidance and analysis issues
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'Code Quality Issue',
        description: 'Component lacks proper error handling',
        intentAnalysis: 'Developer focused on basic functionality',
        suggestedAction: 'Add proper error handling and validation',
        code: 'export default class TestComponent extends LightningElement {}',
        location: {
          startLine: 1,
          endLine: 1,
          startColumn: 1,
          endColumn: 50,
        },
      });
      expect(result[1]).toEqual({
        type: 'Performance Issue',
        description: 'Component may have performance issues on mobile',
        intentAnalysis: 'Developer intended to create a responsive component',
        suggestedAction: 'Optimize component for mobile performance',
        code: 'export default class TestComponent extends LightningElement {}',
        location: {
          startLine: 1,
          endLine: 1,
          startColumn: 1,
          endColumn: 50,
        },
      });

      // Verify MCP client was called correctly
      expect(mockMcpClient.callTool).toHaveBeenCalledTimes(2);
      expect(mockMcpClient.callTool).toHaveBeenNthCalledWith(
        1,
        'sfmobile-web-offline-guidance',
        {}
      );
      expect(mockMcpClient.callTool).toHaveBeenNthCalledWith(
        2,
        'sfmobile-web-offline-analysis',
        mockComponent
      );

      // Verify LLM client was called
      expect(mockLlmClient.callLLM).toHaveBeenCalledTimes(1);
    });

    it('should handle empty guidance response', async () => {
      // Mock empty guidance response
      (mockMcpClient.callTool as vi.Mock)
        .mockResolvedValueOnce({ content: [] })
        .mockResolvedValueOnce(mockAnalysisResponse);

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow(
        'Failed to get guidance instructions from mobile-web offline-guidance tool'
      );
    });

    it('should handle empty analysis response', async () => {
      // Mock guidance response but empty analysis response
      (mockMcpClient.callTool as vi.Mock)
        .mockResolvedValueOnce(mockGuidanceResponse)
        .mockResolvedValueOnce({ content: [] });

      (mockLlmClient.callLLM as vi.Mock).mockResolvedValue(mockLlmResponse);

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow(
        'Failed to get analysis results from mobile-web offline-analysis tool'
      );
    });

    it('should handle invalid JSON in guidance response', async () => {
      // Mock invalid JSON in guidance response
      mockMcpClient.callTool.mockResolvedValueOnce({
        content: [{ text: 'invalid json' }],
      });

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow();
    });

    it('should handle invalid JSON in analysis response', async () => {
      // Mock valid guidance but invalid analysis JSON
      mockMcpClient.callTool.mockResolvedValueOnce(mockGuidanceResponse).mockResolvedValueOnce({
        content: [{ text: 'invalid json' }],
      });

      (mockLlmClient.callLLM as vi.Mock).mockResolvedValue(mockLlmResponse);

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow();
    });

    it('should handle invalid JSON in LLM response', async () => {
      // Mock valid guidance and analysis but invalid LLM response
      mockMcpClient.callTool
        .mockResolvedValueOnce(mockGuidanceResponse)
        .mockResolvedValueOnce(mockAnalysisResponse);

      (mockLlmClient.callLLM as vi.Mock).mockResolvedValue('invalid json response');

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow();
    });

    it('should handle MCP client errors', async () => {
      // Mock MCP client error
      mockMcpClient.callTool.mockRejectedValue(new Error('MCP connection failed'));

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow(
        'MCP connection failed'
      );
    });

    it('should handle LLM client errors', async () => {
      // Mock guidance success but LLM failure
      mockMcpClient.callTool
        .mockResolvedValueOnce(mockGuidanceResponse)
        .mockResolvedValueOnce(mockAnalysisResponse);

      (mockLlmClient.callLLM as vi.Mock).mockRejectedValue(new Error('LLM API error'));

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow('LLM API error');
    });

    it('should handle component with no issues found', async () => {
      // Mock responses with no issues
      const emptyGuidanceResponse = {
        content: [
          {
            text: JSON.stringify({
              reviewInstructions: [
                {
                  expertReviewerName: 'Mobile Compatibility Expert',
                  supportedFileTypes: ['JS', 'HTML'],
                  grounding: 'Mobile-specific considerations',
                  request: 'Review for mobile compatibility issues',
                  expectedResponseFormat: {
                    schema: {},
                    inputValues: {
                      expertReviewerName: 'Mobile Compatibility Expert',
                    },
                  },
                },
              ],
              orchestrationInstructions: 'Test orchestration instructions',
            }),
          },
        ],
      };

      const emptyAnalysisResponse = {
        content: [
          {
            text: JSON.stringify({
              analysisResults: [
                {
                  expertReviewerName: 'Offline Analysis Expert',
                  issues: [],
                },
              ],
              orchestrationInstructions: 'Test analysis orchestration instructions',
            }),
          },
        ],
      };

      mockMcpClient.callTool
        .mockResolvedValueOnce(emptyGuidanceResponse)
        .mockResolvedValueOnce(emptyAnalysisResponse);

      (mockLlmClient.callLLM as vi.Mock).mockResolvedValue(JSON.stringify([]));

      const result = await reviewAgent.reviewLwcComponent(mockComponent);

      expect(result).toHaveLength(0);
    });
  });

  describe('constructor', () => {
    it('should create an instance with provided dependencies', () => {
      const agent = new LwcReviewAgent(mockMcpClient, mockLlmClient);
      expect(agent).toBeInstanceOf(LwcReviewAgent);
    });
  });
});
