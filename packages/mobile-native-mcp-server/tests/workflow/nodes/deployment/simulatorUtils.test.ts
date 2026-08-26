/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchSimulatorDevices,
  parseSimctlDevicesJson,
  findSimulatorByName,
  selectBestSimulator,
  parseIOSVersionToNumber,
  verifySimulatorResponsive,
  waitForSimulatorReady,
  openSimulatorApp,
  readBundleIdFromProject,
} from '../../../../src/workflow/nodes/deployment/ios/simulatorUtils.js';
import { readdir, readFile } from 'fs/promises';

vi.mock('fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(),
    readFile: vi.fn(),
  };
});
import { MockLogger } from '../../../utils/MockLogger.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('simulatorUtils', () => {
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    vi.mocked(readdir).mockReset();
    vi.mocked(readFile).mockReset();
    mockLogger.reset();
  });

  describe('fetchSimulatorDevices', () => {
    it('should successfully fetch and parse simulator devices', async () => {
      const result: CommandResult = {
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
            ],
            'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
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

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      const fetchResult = await fetchSimulatorDevices(mockCommandRunner, mockLogger);

      expect(fetchResult.success).toBe(true);
      if (fetchResult.success) {
        expect(fetchResult.devices).toHaveLength(2);
        expect(fetchResult.devices[0].name).toBe('iPhone 15 Pro');
        expect(fetchResult.devices[0].iosVersion).toBe('18.0');
        expect(fetchResult.devices[1].name).toBe('iPhone 14');
        expect(fetchResult.devices[1].iosVersion).toBe('17.5');
      }
    });

    it('should handle command failure', async () => {
      const result: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Command failed',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      const fetchResult = await fetchSimulatorDevices(mockCommandRunner, mockLogger);

      expect(fetchResult.success).toBe(false);
      if (!fetchResult.success) {
        expect(fetchResult.error).toContain('Command failed');
      }
    });

    it('should handle invalid JSON', async () => {
      const result: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'invalid json',
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      const fetchResult = await fetchSimulatorDevices(mockCommandRunner, mockLogger);

      expect(fetchResult.success).toBe(true);
      if (fetchResult.success) {
        expect(fetchResult.devices).toEqual([]);
      }
    });
  });

  describe('parseSimctlDevicesJson', () => {
    it('should parse valid JSON with iOS version extraction', () => {
      const json = JSON.stringify({
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
      });

      const devices = parseSimctlDevicesJson(json, mockLogger);

      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('iPhone 15 Pro');
      expect(devices[0].iosVersion).toBe('18.0');
      expect(devices[0].runtimeIdentifier).toBe('com.apple.CoreSimulator.SimRuntime.iOS-18-0');
    });

    it('should handle empty devices', () => {
      const json = JSON.stringify({ devices: {} });

      const devices = parseSimctlDevicesJson(json, mockLogger);

      expect(devices).toEqual([]);
    });

    it('should handle invalid JSON gracefully', () => {
      const devices = parseSimctlDevicesJson('invalid json', mockLogger);

      expect(devices).toEqual([]);
    });
  });

  describe('findSimulatorByName', () => {
    it('should find simulator by name', () => {
      const devices = [
        {
          name: 'iPhone 15 Pro',
          udid: 'test-udid-1',
          state: 'Booted',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
          iosVersion: '18.0',
        },
        {
          name: 'iPhone 14',
          udid: 'test-udid-2',
          state: 'Shutdown',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-17-5',
          iosVersion: '17.5',
        },
      ];

      const found = findSimulatorByName(devices, 'iPhone 15 Pro');

      expect(found).toBeDefined();
      expect(found?.name).toBe('iPhone 15 Pro');
    });

    it('should return undefined if not found', () => {
      const devices = [
        {
          name: 'iPhone 15 Pro',
          udid: 'test-udid-1',
          state: 'Booted',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
          iosVersion: '18.0',
        },
      ];

      const found = findSimulatorByName(devices, 'iPhone 20');

      expect(found).toBeUndefined();
    });
  });

  describe('selectBestSimulator', () => {
    it('should select running simulator', () => {
      const devices = [
        {
          name: 'iPhone 15 Pro',
          udid: 'test-udid-1',
          state: 'Shutdown',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
          iosVersion: '18.0',
        },
        {
          name: 'iPhone 14',
          udid: 'test-udid-2',
          state: 'Booted',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-17-5',
          iosVersion: '17.5',
        },
      ];

      const selected = selectBestSimulator(devices, mockLogger);

      expect(selected).toBeDefined();
      expect(selected?.name).toBe('iPhone 14');
    });

    it('should select newest simulator when none running', () => {
      const devices = [
        {
          name: 'iPhone 14',
          udid: 'test-udid-2',
          state: 'Shutdown',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-17-5',
          iosVersion: '17.5',
        },
        {
          name: 'iPhone 15 Pro',
          udid: 'test-udid-1',
          state: 'Shutdown',
          runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-0',
          iosVersion: '18.0',
        },
      ];

      const selected = selectBestSimulator(devices, mockLogger);

      expect(selected).toBeDefined();
      expect(selected?.name).toBe('iPhone 15 Pro');
    });

    it('should return null for empty list', () => {
      const selected = selectBestSimulator([], mockLogger);

      expect(selected).toBeNull();
    });
  });

  describe('parseIOSVersionToNumber', () => {
    it('should parse version string correctly', () => {
      expect(parseIOSVersionToNumber('18.0')).toBe(18000);
      expect(parseIOSVersionToNumber('17.5')).toBe(17050);
      expect(parseIOSVersionToNumber('17.5.1')).toBe(17051);
    });
  });

  describe('verifySimulatorResponsive', () => {
    it('should return true when simulator is responsive', async () => {
      const result: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'system output',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      const isResponsive = await verifySimulatorResponsive(mockCommandRunner, 'iPhone 15 Pro');

      expect(isResponsive).toBe(true);
      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'spawn', 'iPhone 15 Pro', 'launchctl', 'print', 'system'],
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should return false when simulator is not responsive', async () => {
      const result: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Not ready',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      const isResponsive = await verifySimulatorResponsive(mockCommandRunner, 'iPhone 15 Pro');

      expect(isResponsive).toBe(false);
    });

    it('should return false when command throws', async () => {
      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('timeout'));

      const isResponsive = await verifySimulatorResponsive(mockCommandRunner, 'iPhone 15 Pro');

      expect(isResponsive).toBe(false);
    });
  });

  describe('waitForSimulatorReady', () => {
    it('should return success when simulator is booted and responsive', async () => {
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

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(listDevicesResult)
        .mockResolvedValueOnce(verifyResult);

      const result = await waitForSimulatorReady(mockCommandRunner, mockLogger, 'iPhone 15 Pro', {
        maxWaitTime: 5000,
      });

      expect(result.success).toBe(true);
    });

    it('should return error when timeout exceeded', async () => {
      const listDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              {
                name: 'iPhone 15 Pro',
                udid: 'test-udid',
                state: 'Shutdown', // Not booted
                isAvailable: true,
              },
            ],
          },
        }),
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.useFakeTimers();
      vi.mocked(mockCommandRunner.execute).mockResolvedValue(listDevicesResult);

      const resultPromise = waitForSimulatorReady(mockCommandRunner, mockLogger, 'iPhone 15 Pro', {
        maxWaitTime: 1000,
        pollInterval: 100,
      });

      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('did not become ready');
      vi.useRealTimers();
    });

    it('should poll until simulator is ready', async () => {
      const listDevicesResultShutdown: CommandResult = {
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

      const listDevicesResultBooted: CommandResult = {
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

      vi.useFakeTimers();
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(listDevicesResultShutdown)
        .mockResolvedValueOnce(listDevicesResultBooted)
        .mockResolvedValueOnce(verifyResult);

      const resultPromise = waitForSimulatorReady(mockCommandRunner, mockLogger, 'iPhone 15 Pro', {
        maxWaitTime: 10000,
        pollInterval: 100,
      });

      await vi.advanceTimersByTimeAsync(500);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('openSimulatorApp', () => {
    it('should successfully open Simulator.app', async () => {
      const result: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      await openSimulatorApp(mockCommandRunner, mockLogger);

      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'open',
        ['-a', 'Simulator'],
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should handle failure gracefully', async () => {
      const result: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to open',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(result);

      // Should not throw
      await openSimulatorApp(mockCommandRunner, mockLogger);

      expect(mockLogger.hasLoggedMessage('Failed to open Simulator.app GUI', 'warn')).toBe(true);
    });

    it('should handle exception gracefully', async () => {
      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('timeout'));

      // Should not throw
      await openSimulatorApp(mockCommandRunner, mockLogger);

      expect(mockLogger.hasLoggedMessage('Error opening Simulator.app GUI', 'warn')).toBe(true);
    });
  });

  describe('readBundleIdFromProject', () => {
    it('should read bundle ID from project.pbxproj', async () => {
      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('PRODUCT_BUNDLE_IDENTIFIER = "com.test.app";');

      const bundleId = await readBundleIdFromProject('/path/to/project', mockLogger);

      expect(bundleId).toBe('com.test.app');
      expect(mockLogger.hasLoggedMessage('Found bundle ID in project file', 'debug')).toBe(true);
    });

    it('should handle bundle ID without quotes', async () => {
      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('PRODUCT_BUNDLE_IDENTIFIER = com.test.app;');

      const bundleId = await readBundleIdFromProject('/path/to/project', mockLogger);

      expect(bundleId).toBe('com.test.app');
    });

    it('should throw error when project directory cannot be read', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('Permission denied'));

      await expect(readBundleIdFromProject('/path/to/project', mockLogger)).rejects.toThrow(
        'Failed to read project directory at /path/to/project: Permission denied'
      );
    });

    it('should throw error when no .xcodeproj found', async () => {
      vi.mocked(readdir).mockResolvedValue(['somefile.txt'] as unknown as string[]);

      await expect(readBundleIdFromProject('/path/to/project', mockLogger)).rejects.toThrow(
        'No .xcodeproj directory found in project path: /path/to/project'
      );
    });

    it('should throw error when project.pbxproj cannot be read', async () => {
      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      await expect(readBundleIdFromProject('/path/to/project', mockLogger)).rejects.toThrow(
        'Failed to read project.pbxproj file'
      );
    });

    it('should throw error when PRODUCT_BUNDLE_IDENTIFIER is missing', async () => {
      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('// No bundle identifier here');

      await expect(readBundleIdFromProject('/path/to/project', mockLogger)).rejects.toThrow(
        'Could not find PRODUCT_BUNDLE_IDENTIFIER'
      );
    });

    it('should throw error when bundle ID contains unresolved variables', async () => {
      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue(
        'PRODUCT_BUNDLE_IDENTIFIER = "com.test.${PRODUCT_NAME:rfc1034identifier}";'
      );

      await expect(readBundleIdFromProject('/path/to/project', mockLogger)).rejects.toThrow(
        'Bundle ID contains unresolved variables'
      );
    });
  });
});
