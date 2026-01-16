/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AndroidSelectEmulatorNode } from '../../../../src/workflow/nodes/deployment/androidSelectEmulatorNode.js';
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

    it('should select running emulator when available', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const listEmulatorsResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'Pixel_8_API_34\nPixel_7_API_33',
        stderr: '',
        success: true,
        duration: 500,
      };

      const adbDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'List of devices attached\nemulator-5554\tdevice\n',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(listEmulatorsResult)
        .mockResolvedValueOnce(adbDevicesResult);

      const result = await node.execute(state);

      expect(result).toEqual({ androidEmulatorName: expect.any(String) });
    });

    it('should return error when listing emulators fails', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const listEmulatorsResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'emulator: command not found',
        success: false,
        duration: 100,
      };

      const avdManagerResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'avdmanager: command not found',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(listEmulatorsResult)
        .mockResolvedValueOnce(avdManagerResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [expect.stringContaining('Failed to list Android emulators')],
      });
    });

    it('should return error when no emulators found', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const listEmulatorsResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(listEmulatorsResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'No Android emulators found. Please create an emulator via Android Studio > Device Manager.',
        ],
      });
    });

    it('should handle exception during selection', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [expect.stringContaining('Failed to select Android emulator')],
      });
    });
  });
});
