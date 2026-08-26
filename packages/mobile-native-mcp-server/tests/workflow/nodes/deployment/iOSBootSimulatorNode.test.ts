/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { iOSBootSimulatorNode } from '../../../../src/workflow/nodes/deployment/ios/iOSBootSimulatorNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import {
  CommandRunner,
  type CommandResult,
  ProgressReporter,
} from '@salesforce/magen-mcp-workflow';

describe('iOSBootSimulatorNode', () => {
  let node: iOSBootSimulatorNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;
  let mockProgressReporter: ProgressReporter;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    mockProgressReporter = {
      report: vi.fn(),
    };
    node = new iOSBootSimulatorNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('iosBootSimulator');
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
      const nodeWithoutLogger = new iOSBootSimulatorNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-iOS platform', async () => {
      const state = createTestState({
        platform: 'Android',
        targetDevice: 'Pixel 8',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage('Skipping iOS simulator boot for non-iOS platform', 'debug')
      ).toBe(true);
    });

    it('should return error when targetDevice is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      });
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });

    it('should successfully boot simulator', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const bootResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      const verifyResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      const openAppResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(bootResult)
        .mockResolvedValueOnce(listDevicesResult)
        .mockResolvedValueOnce(verifyResult)
        .mockResolvedValueOnce(openAppResult);

      const result = await node.execute(state, {
        configurable: { progressReporter: mockProgressReporter },
      });

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).toHaveBeenCalledTimes(4);
      expect(mockCommandRunner.execute).toHaveBeenNthCalledWith(
        1,
        'xcrun',
        ['simctl', 'boot', 'iPhone 15 Pro'],
        expect.objectContaining({
          timeout: 60000,
          progressReporter: mockProgressReporter,
          commandName: 'Boot iOS Simulator',
        })
      );
    });

    it('should handle already booted simulator', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const bootResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Unable to boot device in current state: Booted',
        success: false,
        duration: 100,
      };

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      const verifyResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      const openAppResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(bootResult)
        .mockResolvedValueOnce(verifyResult)
        .mockResolvedValueOnce(listDevicesResult)
        .mockResolvedValueOnce(verifyResult)
        .mockResolvedValueOnce(openAppResult);

      const result = await node.execute(state, {
        configurable: { progressReporter: mockProgressReporter },
      });

      expect(result).toEqual({});
      expect(mockLogger.hasLoggedMessage('Simulator already booted', 'info')).toBe(true);
    });

    it('should handle boot failure', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const bootResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to boot simulator',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(bootResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to boot iOS simulator "iPhone 15 Pro": Failed to boot simulator',
        ],
      });
    });

    it('should propagate exception during boot', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      // The refactored node lets exceptions bubble up (consistent with Android nodes)
      await expect(node.execute(state)).rejects.toThrow('Network error');
    });

    it('should wait for simulator to be ready after boot', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const bootResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      // First call returns Shutdown, then Booted
      const listDevicesResult1: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Shutdown',
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      const listDevicesResult2: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      const verifyResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      const openAppResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      // Mock setTimeout to speed up test
      vi.useFakeTimers();
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(bootResult)
        .mockResolvedValueOnce(listDevicesResult1)
        .mockResolvedValueOnce(listDevicesResult2)
        .mockResolvedValueOnce(verifyResult)
        .mockResolvedValueOnce(openAppResult);

      const executePromise = node.execute(state, {
        configurable: { progressReporter: mockProgressReporter },
      });

      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(3000);

      const result = await executePromise;

      expect(result).toEqual({});
      vi.useRealTimers();
    });

    it('should handle simulator not responsive initially', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const bootResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      // First verify fails, second succeeds
      const verifyResult1: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Not ready',
        success: false,
        duration: 100,
      };

      const verifyResult2: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      const openAppResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.useFakeTimers();
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(bootResult)
        .mockResolvedValueOnce(listDevicesResult)
        .mockResolvedValueOnce(verifyResult1)
        .mockResolvedValueOnce(listDevicesResult)
        .mockResolvedValueOnce(verifyResult2)
        .mockResolvedValueOnce(openAppResult);

      const executePromise = node.execute(state, {
        configurable: { progressReporter: mockProgressReporter },
      });

      await vi.advanceTimersByTimeAsync(3000);

      const result = await executePromise;

      expect(result).toEqual({});
      vi.useRealTimers();
    });

    it('should handle failure to open Simulator.app gracefully', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const bootResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      const verifyResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      const openAppResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to open',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(bootResult)
        .mockResolvedValueOnce(listDevicesResult)
        .mockResolvedValueOnce(verifyResult)
        .mockResolvedValueOnce(openAppResult);

      const result = await node.execute(state, {
        configurable: { progressReporter: mockProgressReporter },
      });

      // Should still succeed even if opening Simulator.app fails
      expect(result).toEqual({});
      expect(mockLogger.hasLoggedMessage('Failed to open Simulator.app GUI', 'warn')).toBe(true);
    });
  });
});
