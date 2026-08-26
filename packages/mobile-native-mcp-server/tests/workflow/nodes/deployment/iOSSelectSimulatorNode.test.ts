/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { iOSSelectSimulatorNode } from '../../../../src/workflow/nodes/deployment/ios/iOSSelectSimulatorNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('iOSSelectSimulatorNode', () => {
  let node: iOSSelectSimulatorNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    node = new iOSSelectSimulatorNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('iosSelectSimulator');
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
      const nodeWithoutLogger = new iOSSelectSimulatorNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-iOS platform', async () => {
      const state = createTestState({
        platform: 'Android',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage(
          'Skipping iOS simulator selection for non-iOS platform',
          'debug'
        )
      ).toBe(true);
    });

    it('should use existing targetDevice if already set', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(mockLogger.hasLoggedMessage('Target device already set', 'debug')).toBe(true);
    });

    it('should select running simulator when available', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
      });

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid-1',
                state: 'Booted',
                isAvailable: true,
              },
              {
                name: 'iPhone 14',
                udid: 'test-udid-2',
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

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(listDevicesResult);

      const result = await node.execute(state);

      expect(result).toEqual({ targetDevice: 'iPhone 15 Pro' });
      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'list', 'devices', 'available', '--json'],
        expect.objectContaining({
          commandName: 'List iOS Simulators',
        })
      );
    });

    it('should select newest simulator when no running simulator', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
      });

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
              {
                name: 'iPhone 14',
                udid: 'test-udid-2',
                state: 'Shutdown',
                isAvailable: true,
              },
            ],
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid-1',
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

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(listDevicesResult);

      const result = await node.execute(state);

      expect(result).toEqual({ targetDevice: 'iPhone 15 Pro' });
    });

    it('should return error when listing simulators fails', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
      });

      const listDevicesResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'xcrun: error: unable to find simctl',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(listDevicesResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to list iOS simulators: xcrun: error: unable to find simctl. Please ensure Xcode is properly installed.',
        ],
      });
    });

    it('should return error when no simulators found', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
      });

      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {},
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(listDevicesResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'No iOS simulators found. Please install simulators via Xcode.',
        ],
      });
    });

    it('should handle exception during selection', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to select iOS simulator: Network error. Please ensure Xcode is properly installed.',
        ],
      });
    });
  });
});
