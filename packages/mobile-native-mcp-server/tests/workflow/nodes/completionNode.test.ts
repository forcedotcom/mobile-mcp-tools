/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompletionNode } from '../../../src/workflow/nodes/completionNode.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { FINISH_TOOL } from '../../../src/tools/workflow/sfmobile-native-completion/metadata.js';

describe('CompletionNode', () => {
  let node: CompletionNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new CompletionNode(mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('finish');
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
      const nodeWithoutExecutor = new CompletionNode(undefined, mockLogger);
      expect(nodeWithoutExecutor['toolExecutor']).toBeDefined();
      expect(nodeWithoutExecutor['toolExecutor']).not.toBe(mockToolExecutor);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new CompletionNode(mockToolExecutor);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke completion tool with correct tool metadata', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(FINISH_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FINISH_TOOL.description);
    });

    it('should pass projectPath to completion tool', () => {
      const testProjectPath = '/Users/test/MyApp';

      const inputState = createTestState({
        projectPath: testProjectPath,
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input).toBeDefined();
      expect(lastCall?.input.projectPath).toBe(testProjectPath);
    });

    it('should validate result against completion result schema', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      expect(() => {
        node.execute(inputState);
      }).not.toThrow();
    });
  });

  describe('execute() - Project Path Handling', () => {
    it('should handle absolute paths', () => {
      const inputState = createTestState({
        projectPath: '/Users/developer/workspace/MyApp',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/developer/workspace/MyApp');
    });

    it('should handle relative paths', () => {
      const inputState = createTestState({
        projectPath: './projects/MyApp',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('./projects/MyApp');
    });

    it('should handle paths with spaces', () => {
      const inputState = createTestState({
        projectPath: '/Users/test/My Project/My App',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/test/My Project/My App');
    });

    it('should handle Windows paths', () => {
      const inputState = createTestState({
        projectPath: 'C:\\Users\\developer\\MyApp',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('C:\\Users\\developer\\MyApp');
    });

    it('should handle home directory paths', () => {
      const inputState = createTestState({
        projectPath: '~/projects/MyApp',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('~/projects/MyApp');
    });

    it('should handle very long paths', () => {
      const longPath =
        '/Users/developer/workspace/very/long/nested/directory/structure/with/many/levels/MyApp';

      const inputState = createTestState({
        projectPath: longPath,
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe(longPath);
    });
  });

  describe('execute() - Return Value', () => {
    it('should return validated result from tool executor', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      const expectedResult = {};

      mockToolExecutor.setResult(FINISH_TOOL.toolId, expectedResult);

      const result = node.execute(inputState);

      expect(result).toEqual(expectedResult);
    });

    it('should return partial state object', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should return empty object as per schema', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toEqual({});
    });
  });

  describe('execute() - Logging', () => {
    it('should log tool invocation details', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);

      const preExecutionLog = debugLogs.find(log =>
        log.message.includes('Interrupt data (pre-execution)')
      );
      expect(preExecutionLog).toBeDefined();
    });

    it('should log tool result', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const postExecutionLog = debugLogs.find(log =>
        log.message.includes('Tool execution result (post-execution)')
      );
      expect(postExecutionLog).toBeDefined();
    });
  });

  describe('execute() - State Independence', () => {
    it('should only use projectPath from state', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        // Other state properties
        platform: 'iOS',
        projectName: 'TestProject',
        packageName: 'com.test.app',
        organization: 'TestOrg',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/path/to/project');
      expect(lastCall?.input).not.toHaveProperty('platform');
      expect(lastCall?.input).not.toHaveProperty('projectName');
      expect(lastCall?.input).not.toHaveProperty('packageName');
      expect(lastCall?.input).not.toHaveProperty('organization');
    });

    it('should not modify input state', () => {
      const originalProjectPath = '/path/to/project';

      const inputState = createTestState({
        projectPath: originalProjectPath,
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      expect(inputState.projectPath).toBe(originalProjectPath);
    });
  });

  describe('execute() - Real World Scenarios', () => {
    it('should handle iOS project completion', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/developer/ContactListApp-iOS',
        projectName: 'ContactListApp',
        packageName: 'com.salesforce.contactlist',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/developer/ContactListApp-iOS');
      expect(lastCall?.llmMetadata.name).toBe('sfmobile-native-completion');
    });

    it('should handle Android project completion', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectPath: '/home/developer/ContactListApp-Android',
        projectName: 'ContactListApp',
        packageName: 'com.salesforce.contactlist',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/home/developer/ContactListApp-Android');
    });

    it('should handle completion after successful deployment', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/MyApp',
        buildSuccessful: true,
        deploymentStatus: 'deployed',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/dev/MyApp');
    });

    it('should complete workflow with all state populated', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/MyCompleteApp',
        projectName: 'MyCompleteApp',
        packageName: 'com.example.complete',
        organization: 'Example Corp',
        selectedTemplate: 'iOSNativeSwiftTemplate',
        buildSuccessful: true,
        deploymentStatus: 'success',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/dev/MyCompleteApp');
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty project path', () => {
      const inputState = createTestState({
        projectPath: '',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('');
    });

    it('should handle project path with special characters', () => {
      const inputState = createTestState({
        projectPath: '/Users/test/My-App_v2.0/project',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/test/My-App_v2.0/project');
    });

    it('should handle project path with unicode characters', () => {
      const inputState = createTestState({
        projectPath: '/Users/test/项目/MyApp',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBe('/Users/test/项目/MyApp');
    });

    it('should handle undefined projectPath gracefully', () => {
      const inputState = createTestState({
        projectPath: undefined as unknown as string,
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectPath).toBeUndefined();
    });
  });

  describe('execute() - Multiple Invocations', () => {
    it('should handle multiple sequential invocations', () => {
      const state1 = createTestState({
        projectPath: '/path/to/project1',
      });

      const state2 = createTestState({
        projectPath: '/path/to/project2',
      });

      mockToolExecutor.setResult(FINISH_TOOL.toolId, {});

      node.execute(state1);
      const call1 = mockToolExecutor.getLastCall();

      node.execute(state2);
      const call2 = mockToolExecutor.getLastCall();

      expect(call1?.input.projectPath).toBe('/path/to/project1');
      expect(call2?.input.projectPath).toBe('/path/to/project2');
    });
  });
});
