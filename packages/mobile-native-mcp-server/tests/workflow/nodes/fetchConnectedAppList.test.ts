/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FetchConnectedAppListNode } from '../../../src/workflow/nodes/fetchConnectedAppList.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { type CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';
import { MockLogger } from '../../utils/MockLogger.js';

describe('FetchConnectedAppListNode', () => {
  let mockCommandRunner: CommandRunner;
  let mockLogger: MockLogger;
  let node: FetchConnectedAppListNode;

  const defaultSuccessResult: CommandResult = {
    exitCode: 0,
    signal: null,
    stdout: '',
    stderr: '',
    success: true,
    duration: 1000,
  };

  beforeEach(() => {
    mockCommandRunner = {
      execute: vi.fn(),
    };
    mockLogger = new MockLogger();
    node = new FetchConnectedAppListNode(mockCommandRunner, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockLogger.reset();
  });

  describe('Constructor', () => {
    it('should have the correct node name', () => {
      expect(node.name).toBe('fetchConnectedAppList');
    });

    it('should use default logger when none provided', () => {
      const nodeWithDefaultLogger = new FetchConnectedAppListNode(mockCommandRunner);
      expect(nodeWithDefaultLogger).toBeDefined();
    });
  });

  describe('execute() - Success cases', () => {
    it('should return connected app list on successful fetch', async () => {
      const response = {
        status: 0,
        result: [
          {
            createdById: '005xx000001Svlc',
            createdByName: 'Admin User',
            createdDate: '2024-01-15T00:00:00.000Z',
            fileName: 'connectedApps/MyApp.connectedApp',
            fullName: 'MyApp',
            id: '09Hxx0000004Cxx',
            lastModifiedById: '005xx000001Svlc',
            lastModifiedByName: 'Admin User',
            lastModifiedDate: '2024-06-01T00:00:00.000Z',
            type: 'ConnectedApp',
          },
          {
            createdById: '005xx000001Svlc',
            createdByName: 'Dev User',
            createdDate: '2024-03-10T00:00:00.000Z',
            fileName: 'connectedApps/SecondApp.connectedApp',
            fullName: 'SecondApp',
            id: '09Hxx0000004Cyy',
            lastModifiedById: '005xx000001Svlc',
            lastModifiedByName: 'Dev User',
            lastModifiedDate: '2024-07-01T00:00:00.000Z',
            type: 'ConnectedApp',
          },
        ],
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.connectedAppList).toHaveLength(2);
      expect(result.connectedAppList![0]).toEqual({
        fullName: 'MyApp',
        createdByName: 'Admin User',
      });
      expect(result.connectedAppList![1]).toEqual({
        fullName: 'SecondApp',
        createdByName: 'Dev User',
      });
    });

    it('should return empty list when no connected apps found', async () => {
      const response = {
        status: 0,
        result: [],
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.connectedAppList).toEqual([]);
    });

    it('should execute the correct sf command', async () => {
      const response = {
        status: 0,
        result: [],
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      await node.execute(state);

      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'sf',
        ['org', 'list', 'metadata', '-m', 'ConnectedApp', '--json'],
        expect.objectContaining({
          timeout: 60000,
          commandName: 'Fetch Connected App List',
        })
      );
    });

    it('should include target org when selectedOrgUsername is set', async () => {
      const response = {
        status: 0,
        result: [],
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState({ selectedOrgUsername: 'user@example.com' });
      await node.execute(state);

      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'sf',
        ['org', 'list', 'metadata', '-m', 'ConnectedApp', '--json', '-o', 'user@example.com'],
        expect.any(Object)
      );
    });
  });

  describe('execute() - Resume support', () => {
    it('should skip fetch if connectedAppList already exists in state', async () => {
      const state = createTestState({
        connectedAppList: [{ fullName: 'ExistingApp', createdByName: 'Admin' }],
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Error cases', () => {
    it('should return fatal error when command fails with stderr', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        success: false,
        exitCode: 1,
        stderr: 'Authentication error',
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Authentication error');
    });

    it('should return fatal error when command fails without stderr', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        success: false,
        exitCode: 1,
        stderr: '',
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('exit code 1');
    });

    it('should handle command failure with signal', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        success: false,
        exitCode: null,
        signal: 'SIGTERM',
        stderr: '',
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('SIGTERM');
    });

    it('should return fatal error when JSON parsing fails', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: 'not valid json',
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Failed to fetch Connected Apps');
    });

    it('should return fatal error when response has non-zero status', async () => {
      const response = {
        status: 1,
        result: [],
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Failed to fetch Connected Apps');
    });

    it('should return fatal error when commandRunner throws', async () => {
      vi.mocked(mockCommandRunner.execute).mockRejectedValue(new Error('Network error'));

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Network error');
    });

    it('should handle non-Error exception from commandRunner', async () => {
      vi.mocked(mockCommandRunner.execute).mockRejectedValue('string error');

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('string error');
    });
  });
});
