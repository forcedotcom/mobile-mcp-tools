/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateDiscoveryNode } from '../../../src/workflow/nodes/templateDiscovery.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { TEMPLATE_DISCOVERY_TOOL } from '../../../src/tools/plan/sfmobile-native-template-discovery/metadata.js';
import { createTestState } from '../../utils/stateBuilders.js';

// Helper to create valid discovery result matching schema
function createDiscoveryResult(selectedTemplate: string, overrides = {}) {
  return {
    selectedTemplate,
    projectName: 'TestApp',
    packageName: 'com.test.app',
    organization: 'Test Org',
    connectedAppClientId: 'client-123',
    connectedAppCallbackUri: 'testapp://oauth',
    loginHost: 'https://login.salesforce.com',
    ...overrides,
  };
}

describe('TemplateDiscoveryNode', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let node: TemplateDiscoveryNode;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new TemplateDiscoveryNode(mockToolExecutor, mockLogger);
  });

  describe('Node Properties', () => {
    it('should have correct node name', () => {
      expect(node.name).toBe('discoverTemplates');
    });
  });

  describe('execute()', () => {
    it('should pass platform to tool and return validated result', () => {
      const inputState = createTestState({
        userInput: 'test',
        platform: 'iOS',
      });

      const discoveryResult = createDiscoveryResult('ios-template');
      mockToolExecutor.setResult(TEMPLATE_DISCOVERY_TOOL.toolId, discoveryResult);

      const result = node.execute(inputState);

      // Verify tool was called with correct input
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(TEMPLATE_DISCOVERY_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(TEMPLATE_DISCOVERY_TOOL.description);
      expect(lastCall?.llmMetadata.inputSchema).toBe(TEMPLATE_DISCOVERY_TOOL.inputSchema);
      expect(lastCall?.input).toEqual({ platform: 'iOS' });

      // Verify result is passed through with expected structure
      expect(result).toEqual(discoveryResult);
      expect(result.selectedTemplate).toBe('ios-template');
      expect(result).toHaveProperty('projectName');
      expect(result).toHaveProperty('packageName');
    });

    it('should log tool execution', () => {
      const inputState = createTestState({
        userInput: 'test',
        platform: 'iOS',
      });

      const discoveryResult = createDiscoveryResult('test-template');
      mockToolExecutor.setResult(TEMPLATE_DISCOVERY_TOOL.toolId, discoveryResult);
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);

      const preExecutionLog = debugLogs.find(log => log.message.includes('pre-execution'));
      const postExecutionLog = debugLogs.find(log => log.message.includes('post-execution'));

      expect(preExecutionLog).toBeDefined();
      expect(postExecutionLog).toBeDefined();
    });

    it('should handle undefined platform gracefully', () => {
      // Edge case: node called with undefined platform
      // (shouldn't happen in normal flow, but should not crash)
      const inputState = createTestState({
        userInput: 'test',
        platform: undefined,
      });

      const discoveryResult = createDiscoveryResult('fallback-template');
      mockToolExecutor.setResult(TEMPLATE_DISCOVERY_TOOL.toolId, discoveryResult);

      const result = node.execute(inputState);

      expect(result.selectedTemplate).toBe('fallback-template');
    });
  });
});
