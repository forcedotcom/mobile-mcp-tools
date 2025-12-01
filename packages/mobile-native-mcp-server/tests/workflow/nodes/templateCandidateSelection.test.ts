/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateCandidateSelectionNode } from '../../../src/workflow/nodes/templateCandidateSelection.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { TEMPLATE_DISCOVERY_TOOL } from '../../../src/tools/plan/sfmobile-native-template-discovery/metadata.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { TEMPLATE_LIST_SCHEMA } from '../../../src/common/schemas.js';

// Helper to create valid candidate selection result matching schema
function createCandidateSelectionResult(templateCandidates: string[]) {
  return {
    templateCandidates,
  };
}

describe('TemplateCandidateSelectionNode', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let node: TemplateCandidateSelectionNode;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new TemplateCandidateSelectionNode(mockToolExecutor, mockLogger);
  });

  describe('Node Properties', () => {
    it('should have correct node name', () => {
      expect(node.name).toBe('selectTemplateCandidates');
    });
  });

  describe('execute()', () => {
    it('should pass platform and templateOptions to tool and return validated result', () => {
      const templateOptions = TEMPLATE_LIST_SCHEMA.parse({
        templates: [
          { path: 'template1', metadata: { platform: 'ios', displayName: 'Template 1' } },
          { path: 'template2', metadata: { platform: 'ios', displayName: 'Template 2' } },
        ],
      });

      const inputState = createTestState({
        userInput: 'test',
        platform: 'iOS',
        templateOptions,
      });

      const selectionResult = createCandidateSelectionResult(['template1', 'template2']);
      mockToolExecutor.setResult(TEMPLATE_DISCOVERY_TOOL.toolId, selectionResult);

      const result = node.execute(inputState);

      // Verify tool was called with correct input
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(TEMPLATE_DISCOVERY_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(TEMPLATE_DISCOVERY_TOOL.description);
      expect(lastCall?.llmMetadata.inputSchema).toBe(TEMPLATE_DISCOVERY_TOOL.inputSchema);
      expect(lastCall?.input).toEqual({
        platform: 'iOS',
        templateOptions,
      });

      // Verify result is passed through with expected structure
      expect(result).toEqual(selectionResult);
      expect(result.templateCandidates).toEqual(['template1', 'template2']);
    });

    it('should log tool execution', () => {
      const templateOptions = TEMPLATE_LIST_SCHEMA.parse({
        templates: [
          { path: 'template1', metadata: { platform: 'ios', displayName: 'Template 1' } },
        ],
      });

      const inputState = createTestState({
        userInput: 'test',
        platform: 'iOS',
        templateOptions,
      });

      const selectionResult = createCandidateSelectionResult(['template1']);
      mockToolExecutor.setResult(TEMPLATE_DISCOVERY_TOOL.toolId, selectionResult);
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);

      const preExecutionLog = debugLogs.find(log => log.message.includes('pre-execution'));
      const postExecutionLog = debugLogs.find(log => log.message.includes('post-execution'));

      expect(preExecutionLog).toBeDefined();
      expect(postExecutionLog).toBeDefined();
    });

    it('should return error if templateOptions not in state', () => {
      const inputState = createTestState({
        userInput: 'test',
        platform: 'iOS',
        templateOptions: undefined,
      });

      const result = node.execute(inputState);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages?.[0]).toContain(
        'Template options not found in state'
      );
    });

    it('should skip execution if templateCandidates already exist', () => {
      const templateOptions = TEMPLATE_LIST_SCHEMA.parse({
        templates: [
          { path: 'template1', metadata: { platform: 'ios', displayName: 'Template 1' } },
        ],
      });

      const inputState = createTestState({
        userInput: 'test',
        platform: 'iOS',
        templateOptions,
        templateCandidates: ['existing-candidate'],
      });

      mockLogger.reset();
      const result = node.execute(inputState);

      // Should return empty update
      expect(result).toEqual({});
      // Should log that it's skipping
      const debugLogs = mockLogger.getLogsByLevel('debug');
      const skipLog = debugLogs.find(log => log.message.includes('skipping candidate selection'));
      expect(skipLog).toBeDefined();
      // Should not call the tool
      expect(mockToolExecutor.getLastCall()).toBeUndefined();
    });
  });
});
