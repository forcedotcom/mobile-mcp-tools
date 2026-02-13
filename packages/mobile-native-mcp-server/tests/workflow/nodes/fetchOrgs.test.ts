/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FetchOrgsNode } from '../../../src/workflow/nodes/fetchOrgs.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { type CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';
import { MockLogger } from '../../utils/MockLogger.js';

describe('FetchOrgsNode', () => {
  let mockCommandRunner: CommandRunner;
  let mockLogger: MockLogger;
  let node: FetchOrgsNode;

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
    node = new FetchOrgsNode(mockCommandRunner, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should have the correct node name', () => {
      expect(node.name).toBe('fetchOrgs');
    });

    it('should use default logger when none provided', () => {
      const nodeWithDefaultLogger = new FetchOrgsNode(mockCommandRunner);
      expect(nodeWithDefaultLogger).toBeDefined();
    });
  });

  describe('execute() - Success cases', () => {
    it('should return connected devHubs filtered by Connected status', async () => {
      const response = {
        status: 0,
        result: {
          devHubs: [
            {
              username: 'connected@example.com',
              alias: 'myOrg',
              connectedStatus: 'Connected',
            },
            {
              username: 'disconnected@example.com',
              alias: 'oldOrg',
              connectedStatus:
                'Unable to refresh session due to: Error authenticating with the refresh token',
            },
            {
              username: 'another@example.com',
              alias: 'anotherOrg',
              connectedStatus: 'Connected',
            },
          ],
        },
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.orgList).toHaveLength(2);
      expect(result.orgList![0]).toEqual({ username: 'connected@example.com', alias: 'myOrg' });
      expect(result.orgList![1]).toEqual({
        username: 'another@example.com',
        alias: 'anotherOrg',
      });
    });

    it('should handle orgs without alias', async () => {
      const response = {
        status: 0,
        result: {
          devHubs: [
            {
              username: 'noalias@example.com',
              connectedStatus: 'Connected',
            },
          ],
        },
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.orgList).toHaveLength(1);
      expect(result.orgList![0]).toEqual({ username: 'noalias@example.com' });
      expect(result.orgList![0]).not.toHaveProperty('alias');
    });

    it('should return empty orgList when no connected devHubs', async () => {
      const response = {
        status: 0,
        result: {
          devHubs: [
            {
              username: 'disconnected@example.com',
              alias: 'oldOrg',
              connectedStatus: 'Disconnected',
            },
          ],
        },
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.orgList).toEqual([]);
    });

    it('should return empty orgList when devHubs is empty', async () => {
      const response = {
        status: 0,
        result: {
          devHubs: [],
        },
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.orgList).toEqual([]);
    });

    it('should execute the correct sf command', async () => {
      const response = {
        status: 0,
        result: { devHubs: [] },
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
        ['org', 'list', '--json'],
        expect.objectContaining({
          timeout: 60000,
          commandName: 'Fetch Org List',
        })
      );
    });
  });

  describe('execute() - Resume support', () => {
    it('should skip fetch if orgList already exists in state', async () => {
      const state = createTestState({
        orgList: [{ username: 'existing@example.com', alias: 'existing' }],
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Error cases', () => {
    it('should return fatal error when command fails', async () => {
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

    it('should return fatal error when JSON parsing fails', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: 'not valid json',
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Failed to fetch Salesforce orgs');
    });

    it('should return fatal error when response has non-zero status', async () => {
      const response = {
        status: 1,
        result: { devHubs: [] },
        warnings: [],
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue({
        ...defaultSuccessResult,
        stdout: JSON.stringify(response),
      });

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('non-zero status');
    });

    it('should return fatal error when commandRunner throws', async () => {
      vi.mocked(mockCommandRunner.execute).mockRejectedValue(new Error('Network error'));

      const state = createTestState();
      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Network error');
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
  });
});
