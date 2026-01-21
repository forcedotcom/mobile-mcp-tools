/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FailureNode } from '../../../src/workflow/nodes/failureNode.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { FAILURE_TOOL } from '../../../src/tools/workflow/sfmobile-native-failure/metadata.js';

describe('FailureNode', () => {
  let node: FailureNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new FailureNode(mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('workflowFailure');
    });

    it('should extend AbstractToolNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should use provided tool executor', () => {
      expect(node['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default tool executor when none provided', () => {
      const nodeWithoutExecutor = new FailureNode(undefined, mockLogger);
      expect(nodeWithoutExecutor['toolExecutor']).toBeDefined();
      expect(nodeWithoutExecutor['toolExecutor']).not.toBe(mockToolExecutor);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new FailureNode(mockToolExecutor);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke failure tool with correct tool metadata', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error message 1'],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(FAILURE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FAILURE_TOOL.description);
    });

    it('should pass workflowFatalErrorMessages to failure tool', () => {
      const testMessages = ['Environment variable not set', 'Another error occurred'];

      const inputState = createTestState({
        workflowFatalErrorMessages: testMessages,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input).toBeDefined();
      expect(lastCall?.input.messages).toEqual(testMessages);
    });

    it('should validate result against failure result schema', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error message'],
      });

      // Valid result per FAILURE_WORKFLOW_RESULT_SCHEMA (empty object)
      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      expect(() => {
        node.execute(inputState);
      }).not.toThrow();
    });
  });

  describe('execute() - Single Error Message', () => {
    it('should handle single error message', () => {
      const singleMessage = ['CONNECTED_APP_CONSUMER_KEY environment variable not set'];

      const inputState = createTestState({
        workflowFatalErrorMessages: singleMessage,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(singleMessage);
    });

    it('should pass single message unchanged', () => {
      const message = 'A single error message with details';

      const inputState = createTestState({
        workflowFatalErrorMessages: [message],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toHaveLength(1);
      expect(lastCall?.input.messages[0]).toBe(message);
    });
  });

  describe('execute() - Multiple Error Messages', () => {
    it('should handle multiple error messages', () => {
      const multipleMessages = [
        'CONNECTED_APP_CONSUMER_KEY environment variable not set',
        'CONNECTED_APP_CALLBACK_URL environment variable not set',
      ];

      const inputState = createTestState({
        workflowFatalErrorMessages: multipleMessages,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(multipleMessages);
    });

    it('should preserve message order', () => {
      const orderedMessages = ['First error', 'Second error', 'Third error'];

      const inputState = createTestState({
        workflowFatalErrorMessages: orderedMessages,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(orderedMessages);
      expect(lastCall?.input.messages[0]).toBe('First error');
      expect(lastCall?.input.messages[1]).toBe('Second error');
      expect(lastCall?.input.messages[2]).toBe('Third error');
    });

    it('should handle many error messages', () => {
      const manyMessages = Array.from({ length: 10 }, (_, i) => `Error message ${i + 1}`);

      const inputState = createTestState({
        workflowFatalErrorMessages: manyMessages,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toHaveLength(10);
      expect(lastCall?.input.messages).toEqual(manyMessages);
    });
  });

  describe('execute() - Return Value', () => {
    it('should return validated result from tool executor', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error message'],
      });

      const expectedResult = {};
      mockToolExecutor.setResult(FAILURE_TOOL.toolId, expectedResult);

      const result = node.execute(inputState);

      expect(result).toEqual(expectedResult);
    });

    it('should return partial state object', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error message'],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('execute() - Logging', () => {
    it('should log tool invocation details', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Test error message'],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});
      mockLogger.reset();

      node.execute(inputState);

      // Should have logged the invocation (pre and post execution)
      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);

      // Check for pre-execution log
      const preExecutionLog = debugLogs.find(log =>
        log.message.includes('Interrupt data (pre-execution)')
      );
      expect(preExecutionLog).toBeDefined();
    });

    it('should log tool result', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Test error message'],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});
      mockLogger.reset();

      node.execute(inputState);

      // Check for post-execution log
      const debugLogs = mockLogger.getLogsByLevel('debug');
      const postExecutionLog = debugLogs.find(log =>
        log.message.includes('Tool execution result (post-execution)')
      );
      expect(postExecutionLog).toBeDefined();
    });
  });

  describe('execute() - State Independence', () => {
    it('should only use workflowFatalErrorMessages from state', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error message'],
        // Other state properties
        projectName: 'TestProject',
        platform: 'iOS',
        userInput: 'Create an app',
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      // Should only pass messages, not other state properties
      expect(lastCall?.input.messages).toBeDefined();
      expect(lastCall?.input).not.toHaveProperty('projectName');
      expect(lastCall?.input).not.toHaveProperty('platform');
      expect(lastCall?.input).not.toHaveProperty('userInput');
    });

    it('should not modify input state', () => {
      const originalMessages = ['Error message 1', 'Error message 2'];
      const inputState = createTestState({
        workflowFatalErrorMessages: originalMessages,
        projectName: 'TestProject',
      });

      const originalProjectName = inputState.projectName;

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      // Input state should remain unchanged
      expect(inputState.projectName).toBe(originalProjectName);
      expect(inputState.workflowFatalErrorMessages).toBe(originalMessages);
      expect(inputState.workflowFatalErrorMessages).toHaveLength(2);
    });
  });

  describe('execute() - Error Message Content', () => {
    it('should handle error messages with special characters', () => {
      const specialMessages = [
        'Error with "quotes" and \'apostrophes\'',
        'Error with <HTML> tags',
        'Error with $pecial ch@racters!',
      ];

      const inputState = createTestState({
        workflowFatalErrorMessages: specialMessages,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(specialMessages);
    });

    it('should handle error messages with newlines', () => {
      const messagesWithNewlines = [
        'Error message\nwith newline',
        'Another error\n\nwith multiple newlines',
      ];

      const inputState = createTestState({
        workflowFatalErrorMessages: messagesWithNewlines,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(messagesWithNewlines);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(1000);

      const inputState = createTestState({
        workflowFatalErrorMessages: [longMessage],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages[0]).toBe(longMessage);
      expect(lastCall?.input.messages[0]).toHaveLength(1007); // "Error: " + 1000 x's
    });

    it('should handle unicode characters in error messages', () => {
      const unicodeMessages = [
        'Error with emoji: 🔥💥⚠️',
        'Error with Chinese: 错误信息',
        'Error with Cyrillic: Ошибка',
      ];

      const inputState = createTestState({
        workflowFatalErrorMessages: unicodeMessages,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(unicodeMessages);
    });
  });

  describe('execute() - Real World Scenarios', () => {
    it('should handle environment validation failure scenario', () => {
      const environmentErrors = [
        'You must set the CONNECTED_APP_CONSUMER_KEY environment variable, with your Salesforce Connected App Consumer Key associated with the mobile app.',
        'You must set the CONNECTED_APP_CALLBACK_URL environment variable, with your Salesforce Connected App Callback URL associated with the mobile app.',
      ];

      const inputState = createTestState({
        validEnvironment: false,
        workflowFatalErrorMessages: environmentErrors,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toBeDefined();

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(environmentErrors);
      expect(lastCall?.llmMetadata.name).toBe('sfmobile-native-failure');
    });

    it('should handle missing consumer key only', () => {
      const consumerKeyError = ['You must set the CONNECTED_APP_CONSUMER_KEY environment variable'];

      const inputState = createTestState({
        validEnvironment: false,
        workflowFatalErrorMessages: consumerKeyError,
        connectedAppCallbackUri: 'myapp://callback',
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toHaveLength(1);
      expect(lastCall?.input.messages[0]).toContain('CONNECTED_APP_CONSUMER_KEY');
    });

    it('should handle missing callback URL only', () => {
      const callbackUrlError = ['You must set the CONNECTED_APP_CALLBACK_URL environment variable'];

      const inputState = createTestState({
        validEnvironment: false,
        workflowFatalErrorMessages: callbackUrlError,
        connectedAppClientId: '3MVG9Kip4IKAZQEXPNwTYYd.example',
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toHaveLength(1);
      expect(lastCall?.input.messages[0]).toContain('CONNECTED_APP_CALLBACK_URL');
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty error messages array', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: [],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual([]);
      expect(lastCall?.input.messages).toHaveLength(0);
    });

    it('should handle undefined workflowFatalErrorMessages', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      // This should work because the tool invocation will use undefined,
      // which may or may not be valid depending on schema
      const result = node.execute(inputState);
      expect(result).toBeDefined();
    });

    it('should handle empty string messages', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['', ''],
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.messages).toEqual(['', '']);
    });
  });

  describe('execute() - Multiple Invocations', () => {
    it('should handle multiple sequential invocations', () => {
      const messages1 = ['Error 1'];
      const messages2 = ['Error 2'];

      const state1 = createTestState({
        workflowFatalErrorMessages: messages1,
      });

      const state2 = createTestState({
        workflowFatalErrorMessages: messages2,
      });

      mockToolExecutor.setResult(FAILURE_TOOL.toolId, {});

      node.execute(state1);
      const call1 = mockToolExecutor.getLastCall();

      node.execute(state2);
      const call2 = mockToolExecutor.getLastCall();

      expect(call1?.input.messages).toEqual(messages1);
      expect(call2?.input.messages).toEqual(messages2);
    });
  });
});
