/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelectConnectedAppNode } from '../../../src/workflow/nodes/selectConnectedApp.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { type ToolExecutor } from '@salesforce/magen-mcp-workflow';

/**
 * Simple mock ToolExecutor for NodeGuidanceData-based nodes.
 * Returns a pre-configured result regardless of input data.
 */
function createMockToolExecutor(result: unknown): ToolExecutor {
  return {
    execute: vi.fn().mockReturnValue(result),
  };
}

describe('SelectConnectedAppNode', () => {
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockLogger.reset();
  });

  describe('Constructor', () => {
    it('should have the correct node name', () => {
      const node = new SelectConnectedAppNode(createMockToolExecutor({}), mockLogger);
      expect(node.name).toBe('selectConnectedApp');
    });

    it('should use default logger when none provided', () => {
      const nodeWithDefaultLogger = new SelectConnectedAppNode();
      expect(nodeWithDefaultLogger).toBeDefined();
    });
  });

  describe('execute() - Resume support', () => {
    it('should skip selection if selectedConnectedAppName already set', () => {
      const node = new SelectConnectedAppNode(createMockToolExecutor({}), mockLogger);
      const state = createTestState({
        connectedAppList: [{ fullName: 'MyApp', createdByName: 'Admin' }],
        selectedConnectedAppName: 'MyApp',
      });

      const result = node.execute(state);

      expect(result).toEqual({});
    });
  });

  describe('execute() - Validation', () => {
    it('should return fatal error if connectedAppList is undefined', () => {
      const node = new SelectConnectedAppNode(createMockToolExecutor({}), mockLogger);
      const state = createTestState({
        connectedAppList: undefined,
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'No Connected Apps available for selection'
      );
    });

    it('should return fatal error if connectedAppList is empty', () => {
      const node = new SelectConnectedAppNode(createMockToolExecutor({}), mockLogger);
      const state = createTestState({
        connectedAppList: [],
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'No Connected Apps available for selection'
      );
    });
  });

  describe('execute() - Successful selection', () => {
    it('should return selectedConnectedAppName on valid selection', () => {
      const mockExecutor = createMockToolExecutor({
        selectedConnectedAppName: 'MyApp',
      });
      const node = new SelectConnectedAppNode(mockExecutor, mockLogger);

      const state = createTestState({
        connectedAppList: [
          { fullName: 'MyApp', createdByName: 'Admin' },
          { fullName: 'OtherApp', createdByName: 'Dev' },
        ],
      });

      const result = node.execute(state);

      expect(result.selectedConnectedAppName).toBe('MyApp');
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should select the second app from the list', () => {
      const mockExecutor = createMockToolExecutor({
        selectedConnectedAppName: 'OtherApp',
      });
      const node = new SelectConnectedAppNode(mockExecutor, mockLogger);

      const state = createTestState({
        connectedAppList: [
          { fullName: 'MyApp', createdByName: 'Admin' },
          { fullName: 'OtherApp', createdByName: 'Dev' },
        ],
      });

      const result = node.execute(state);

      expect(result.selectedConnectedAppName).toBe('OtherApp');
    });
  });

  describe('execute() - Invalid selection', () => {
    it('should return fatal error if selected app not in list', () => {
      const mockExecutor = createMockToolExecutor({
        selectedConnectedAppName: 'NonexistentApp',
      });
      const node = new SelectConnectedAppNode(mockExecutor, mockLogger);

      const state = createTestState({
        connectedAppList: [{ fullName: 'MyApp', createdByName: 'Admin' }],
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('not in the available list');
    });

    it('should return fatal error if selection returns empty selectedConnectedAppName', () => {
      const mockExecutor = createMockToolExecutor({
        selectedConnectedAppName: '',
      });
      const node = new SelectConnectedAppNode(mockExecutor, mockLogger);

      const state = createTestState({
        connectedAppList: [{ fullName: 'MyApp', createdByName: 'Admin' }],
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'did not return a selectedConnectedAppName'
      );
    });
  });
});
