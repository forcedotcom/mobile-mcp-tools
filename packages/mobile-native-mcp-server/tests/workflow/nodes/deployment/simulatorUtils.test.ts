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
} from '../../../../src/workflow/nodes/deployment/simulatorUtils.js';
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
});
