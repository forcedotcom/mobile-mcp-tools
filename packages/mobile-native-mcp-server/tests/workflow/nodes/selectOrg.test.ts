/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelectOrgNode } from '../../../src/workflow/nodes/selectOrg.js';
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

describe('SelectOrgNode', () => {
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
      const node = new SelectOrgNode(createMockToolExecutor({}), mockLogger);
      expect(node.name).toBe('selectOrg');
    });

    it('should use default logger when none provided', () => {
      const nodeWithDefaultLogger = new SelectOrgNode();
      expect(nodeWithDefaultLogger).toBeDefined();
    });
  });

  describe('execute() - Resume support', () => {
    it('should skip selection if selectedOrgUsername already set', () => {
      const node = new SelectOrgNode(createMockToolExecutor({}), mockLogger);
      const state = createTestState({
        orgList: [{ username: 'user@example.com', alias: 'myOrg' }],
        selectedOrgUsername: 'user@example.com',
      });

      const result = node.execute(state);

      expect(result).toEqual({});
    });
  });

  describe('execute() - Validation', () => {
    it('should return fatal error if orgList is undefined', () => {
      const node = new SelectOrgNode(createMockToolExecutor({}), mockLogger);
      const state = createTestState({
        orgList: undefined,
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'No Salesforce orgs available for selection'
      );
    });

    it('should return fatal error if orgList is empty', () => {
      const node = new SelectOrgNode(createMockToolExecutor({}), mockLogger);
      const state = createTestState({
        orgList: [],
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'No Salesforce orgs available for selection'
      );
    });
  });

  describe('execute() - Successful selection', () => {
    it('should return selectedOrgUsername on valid selection', () => {
      const mockExecutor = createMockToolExecutor({
        selectedOrgUsername: 'user@example.com',
      });
      const node = new SelectOrgNode(mockExecutor, mockLogger);

      const state = createTestState({
        orgList: [
          { username: 'user@example.com', alias: 'myOrg' },
          { username: 'other@example.com', alias: 'otherOrg' },
        ],
      });

      const result = node.execute(state);

      expect(result.selectedOrgUsername).toBe('user@example.com');
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should work with orgs that have no alias', () => {
      const mockExecutor = createMockToolExecutor({
        selectedOrgUsername: 'noalias@example.com',
      });
      const node = new SelectOrgNode(mockExecutor, mockLogger);

      const state = createTestState({
        orgList: [{ username: 'noalias@example.com' }],
      });

      const result = node.execute(state);

      expect(result.selectedOrgUsername).toBe('noalias@example.com');
    });
  });

  describe('execute() - Invalid selection', () => {
    it('should return fatal error if selected org not in list', () => {
      const mockExecutor = createMockToolExecutor({
        selectedOrgUsername: 'notinlist@example.com',
      });
      const node = new SelectOrgNode(mockExecutor, mockLogger);

      const state = createTestState({
        orgList: [{ username: 'user@example.com', alias: 'myOrg' }],
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('not in the available list');
    });

    it('should return fatal error if selection returns empty username', () => {
      const mockExecutor = createMockToolExecutor({
        selectedOrgUsername: '',
      });
      const node = new SelectOrgNode(mockExecutor, mockLogger);

      const state = createTestState({
        orgList: [{ username: 'user@example.com', alias: 'myOrg' }],
      });

      const result = node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
    });
  });
});
