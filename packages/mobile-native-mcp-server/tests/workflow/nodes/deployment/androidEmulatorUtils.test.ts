/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchAndroidEmulators,
  extractApiLevelFromName,
  selectBestEmulator,
  findEmulatorByName,
  hasCompatibleEmulator,
  waitForEmulatorReady,
} from '../../../../src/workflow/nodes/deployment/androidEmulatorUtils.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('androidEmulatorUtils', () => {
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    mockLogger.reset();
  });

  describe('fetchAndroidEmulators', () => {
    it('should successfully fetch emulators using emulator command', async () => {
      const avdListResult: CommandResult = {
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
        .mockResolvedValueOnce(avdListResult)
        .mockResolvedValueOnce(adbDevicesResult);

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.emulators.length).toBeGreaterThan(0);
      }
    });

    it('should fallback to avdmanager when emulator command fails', async () => {
      const avdListResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'emulator: command not found',
        success: false,
        duration: 100,
      };

      const avdManagerResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'Pixel_8_API_34',
        stderr: '',
        success: true,
        duration: 500,
      };

      const adbDevicesResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'List of devices attached\n',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(avdListResult)
        .mockResolvedValueOnce(avdManagerResult)
        .mockResolvedValueOnce(adbDevicesResult);

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(true);
    });

    it('should handle complete failure', async () => {
      const avdListResult: CommandResult = {
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
        .mockResolvedValueOnce(avdListResult)
        .mockResolvedValueOnce(avdManagerResult);

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(false);
    });
  });

  describe('extractApiLevelFromName', () => {
    it('should extract API level from hyphen pattern', () => {
      expect(extractApiLevelFromName('pixel-28')).toBe(28);
      expect(extractApiLevelFromName('device-30')).toBe(30);
    });

    it('should extract API level from API_ pattern', () => {
      expect(extractApiLevelFromName('Pixel_3a_API_30')).toBe(30);
      expect(extractApiLevelFromName('Nexus_5X_API_28_x86')).toBe(28);
      expect(extractApiLevelFromName('PixelAPI34')).toBe(34);
    });

    it('should return undefined when no pattern matches', () => {
      expect(extractApiLevelFromName('UnknownDevice')).toBeUndefined();
    });
  });

  describe('selectBestEmulator', () => {
    it('should select running compatible emulator', () => {
      const emulators = [
        {
          name: 'Pixel_8_API_34',
          apiLevel: 34,
          isRunning: false,
          isCompatible: true,
        },
        {
          name: 'Pixel_7_API_33',
          apiLevel: 33,
          isRunning: true,
          isCompatible: true,
        },
      ];

      const selected = selectBestEmulator(emulators, mockLogger);

      expect(selected).toBeDefined();
      expect(selected?.name).toBe('Pixel_7_API_33');
    });

    it('should select highest API level compatible emulator when none running', () => {
      const emulators = [
        {
          name: 'Pixel_7_API_33',
          apiLevel: 33,
          isRunning: false,
          isCompatible: true,
        },
        {
          name: 'Pixel_8_API_34',
          apiLevel: 34,
          isRunning: false,
          isCompatible: true,
        },
      ];

      const selected = selectBestEmulator(emulators, mockLogger);

      expect(selected).toBeDefined();
      expect(selected?.name).toBe('Pixel_8_API_34');
    });

    it('should return null for empty list', () => {
      const selected = selectBestEmulator([], mockLogger);

      expect(selected).toBeNull();
    });
  });

  describe('findEmulatorByName', () => {
    it('should find emulator by name', () => {
      const emulators = [
        {
          name: 'Pixel_8_API_34',
          apiLevel: 34,
          isRunning: false,
          isCompatible: true,
        },
        {
          name: 'Pixel_7_API_33',
          apiLevel: 33,
          isRunning: false,
          isCompatible: true,
        },
      ];

      const found = findEmulatorByName(emulators, 'Pixel_8_API_34');

      expect(found).toBeDefined();
      expect(found?.name).toBe('Pixel_8_API_34');
    });

    it('should return undefined if not found', () => {
      const emulators = [
        {
          name: 'Pixel_8_API_34',
          apiLevel: 34,
          isRunning: false,
          isCompatible: true,
        },
      ];

      const found = findEmulatorByName(emulators, 'Unknown');

      expect(found).toBeUndefined();
    });
  });

  describe('hasCompatibleEmulator', () => {
    it('should return true when compatible emulator exists', () => {
      const emulators = [
        {
          name: 'Pixel_8_API_34',
          apiLevel: 34,
          isRunning: false,
          isCompatible: true,
        },
        {
          name: 'Pixel_7_API_33',
          apiLevel: 33,
          isRunning: false,
          isCompatible: true,
        },
      ];

      expect(hasCompatibleEmulator(emulators, 30)).toBe(true);
    });

    it('should return false when no compatible emulator', () => {
      const emulators = [
        {
          name: 'Pixel_7_API_33',
          apiLevel: 33,
          isRunning: false,
          isCompatible: true,
        },
      ];

      expect(hasCompatibleEmulator(emulators, 40)).toBe(false);
    });
  });

  describe('waitForEmulatorReady', () => {
    it('should return success when emulator is ready', async () => {
      const waitResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 1000,
      };

      const bootResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '1',
        stderr: '',
        success: true,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce(waitResult)
        .mockResolvedValueOnce(bootResult);

      const result = await waitForEmulatorReady(mockCommandRunner, mockLogger);

      expect(result.success).toBe(true);
    });

    it('should handle wait failure', async () => {
      const waitResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Device not found',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(waitResult);

      const result = await waitForEmulatorReady(mockCommandRunner, mockLogger);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('adb wait-for-device failed');
      }
    });
  });
});
