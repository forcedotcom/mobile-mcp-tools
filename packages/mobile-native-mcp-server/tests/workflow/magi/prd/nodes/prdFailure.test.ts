/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRDFailureNode } from '../../../../../src/workflow/magi/prd/nodes/prdFailure.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { PRD_FAILURE_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-failure/metadata.js';

describe('PRDFailureNode', () => {
  let node: PRDFailureNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDFailureNode(mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('prdFailure');
    });

    it('should use provided tool executor', () => {
      expect(node['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default tool executor when none provided', () => {
      const nodeWithoutExecutor = new PRDFailureNode(undefined, mockLogger);
      expect(nodeWithoutExecutor['toolExecutor']).toBeDefined();
      expect(nodeWithoutExecutor['toolExecutor']).not.toBe(mockToolExecutor);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new PRDFailureNode(mockToolExecutor);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke failure tool with correct tool metadata', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Error message 1'],
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(PRD_FAILURE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(PRD_FAILURE_TOOL.description);
    });

    it('should pass prdWorkflowFatalErrorMessages to failure tool', () => {
      const testMessages = ['PRD generation error', 'Another error occurred'];

      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: testMessages,
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input).toBeDefined();
      expect(lastCall?.input.messages).toEqual(testMessages);
    });

    it('should validate result against failure result schema', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Error message'],
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      expect(() => {
        node.execute(inputState);
      }).not.toThrow();
    });
  });

  describe('execute() - Single Error Message', () => {
    it('should handle single error message', () => {
      const singleMessage = ['PRD generation failed'];

      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: singleMessage,
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(singleMessage);
    });
  });

  describe('execute() - Multiple Error Messages', () => {
    it('should handle multiple error messages', () => {
      const multipleMessages = ['Error 1', 'Error 2', 'Error 3'];

      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: multipleMessages,
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(multipleMessages);
    });

    it('should preserve message order', () => {
      const orderedMessages = ['First error', 'Second error', 'Third error'];

      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: orderedMessages,
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(orderedMessages);
      expect(lastCall?.input.messages[0]).toBe('First error');
      expect(lastCall?.input.messages[1]).toBe('Second error');
      expect(lastCall?.input.messages[2]).toBe('Third error');
    });
  });

  describe('execute() - Return Value', () => {
    it('should return validated result from tool executor', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Error message'],
      });

      const expectedResult = {};
      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, expectedResult);

      const result = node.execute(inputState);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('execute() - Logging', () => {
    it('should log tool invocation details', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Test error message'],
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty error messages array', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: [],
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual([]);
    });

    it('should handle undefined prdWorkflowFatalErrorMessages', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: undefined,
      });

      mockToolExecutor.setResult(PRD_FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual([]);
    });
  });
});
