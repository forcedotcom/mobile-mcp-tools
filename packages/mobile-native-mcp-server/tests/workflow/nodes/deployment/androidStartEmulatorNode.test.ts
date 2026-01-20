/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AndroidStartEmulatorNode } from '../../../../src/workflow/nodes/deployment/android/androidStartEmulatorNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('AndroidStartEmulatorNode', () => {
  let node: AndroidStartEmulatorNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    node = new AndroidStartEmulatorNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('androidStartEmulator');
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
      const nodeWithoutLogger = new AndroidStartEmulatorNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-Android platform', async () => {
      const state = createTestState({
        platform: 'iOS',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage(
          'Skipping Android emulator start for non-Android platform',
          'debug'
        )
      ).toBe(true);
    });

    it('should return error when androidEmulatorName is missing', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: undefined,
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Emulator name must be selected before starting. Ensure AndroidSelectEmulatorNode ran successfully.',
        ],
      });
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });

    it('should successfully start emulator when SF CLI returns success', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_8_API_34',
        projectPath: '/path/to/project',
      });

      const startResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'Emulator started',
        stderr: '',
        success: true,
        duration: 100,
      };

      const waitForDeviceResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const bootCompletedResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '1',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(startResult)
        .mockResolvedValueOnce(waitForDeviceResult)
        .mockResolvedValueOnce(bootCompletedResult);

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).toHaveBeenCalledTimes(3);
    });

    it('should call SF CLI with correct arguments', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_8_API_34',
        projectPath: '/path/to/project',
      });

      const startResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'Emulator started',
        stderr: '',
        success: true,
        duration: 100,
      };

      const waitForDeviceResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const bootCompletedResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '1',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(startResult)
        .mockResolvedValueOnce(waitForDeviceResult)
        .mockResolvedValueOnce(bootCompletedResult);

      await node.execute(state);

      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'sf',
        ['force', 'lightning', 'local', 'device', 'start', '-p', 'android', '-t', 'Pixel_8_API_34'],
        expect.objectContaining({
          timeout: 120000,
          cwd: '/path/to/project',
          commandName: 'Start Android Emulator',
        })
      );
    });

    it('should handle already running emulator', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_8_API_34',
        projectPath: '/path/to/project',
      });

      const startResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Emulator already running',
        success: false,
        duration: 100,
      };

      const waitForDeviceResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const bootCompletedResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '1',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(startResult)
        .mockResolvedValueOnce(waitForDeviceResult)
        .mockResolvedValueOnce(bootCompletedResult);

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(
        mockLogger.hasLoggedMessage('Emulator already running, verifying responsiveness', 'info')
      ).toBe(true);
    });

    it('should handle start failure', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_8_API_34',
        projectPath: '/path/to/project',
      });

      const startResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to start emulator',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(startResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to start Android emulator "Pixel_8_API_34": Failed to start emulator',
        ],
      });
    });

    it('should propagate exception during start', async () => {
      const state = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_8_API_34',
        projectPath: '/path/to/project',
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      // Exceptions now propagate (consistent with refactored pattern)
      await expect(node.execute(state)).rejects.toThrow('Network error');
    });
  });
});
