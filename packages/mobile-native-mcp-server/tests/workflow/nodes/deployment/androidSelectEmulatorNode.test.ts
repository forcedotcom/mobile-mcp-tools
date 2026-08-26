/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AndroidSelectEmulatorNode } from '../../../../src/workflow/nodes/deployment/android/androidSelectEmulatorNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('AndroidSelectEmulatorNode', () => {
  let node: AndroidSelectEmulatorNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    node = new AndroidSelectEmulatorNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('androidSelectEmulator');
    });

    it('should extend BaseNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new AndroidSelectEmulatorNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-Android platform', async () => {
      const state = createTestState({
        platform: 'iOS',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage(
          'Skipping Android emulator selection for non-Android platform',
          'debug'
        )
      ).toBe(true);
    });

    it('should use existing androidEmulatorName if already set', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(mockLogger.hasLoggedMessage('Android emulator already set', 'debug')).toBe(true);
    });

    it('should select emulator with highest API level', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const sfDeviceListResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          outputContent: [
            {
              id: 'Pixel_8_API_34',
              name: 'Pixel 8 API 34',
              deviceType: 'mobile',
              osType: 'google apis',
              osVersion: { major: 34, minor: 0, patch: 0 },
              isPlayStore: false,
              port: -1,
            },
            {
              id: 'Pixel_7_API_33',
              name: 'Pixel 7 API 33',
              deviceType: 'mobile',
              osType: 'google apis',
              osVersion: { major: 33, minor: 0, patch: 0 },
              isPlayStore: false,
              port: -1,
            },
          ],
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(sfDeviceListResult);

      const result = await node.execute(state);

      expect(result).toEqual({ androidEmulatorName: 'Pixel_8_API_34' });
    });

    it('should return error when sf command fails', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const sfDeviceListResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'sf: command not found',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(sfDeviceListResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [expect.stringContaining('Failed to list Android emulators')],
      });
    });

    it('should return empty state when no emulators found (router handles creation)', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const sfDeviceListResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          outputContent: [],
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(sfDeviceListResult);

      const result = await node.execute(state);

      // When no emulators found, returns empty state - router will route to create emulator
      expect(result).toEqual({});
      expect(mockLogger.hasLoggedMessage('No emulators found, will create one', 'warn')).toBe(true);
    });

    it('should handle exception during selection', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      // Exceptions are caught and returned as error messages in state
      const result = await node.execute(state);
      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to select Android emulator: Network error. Please ensure Android SDK is properly installed.',
        ],
      });
    });
  });
});
