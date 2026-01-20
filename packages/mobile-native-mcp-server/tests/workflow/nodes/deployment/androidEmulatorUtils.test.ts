/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchAndroidEmulators,
  selectBestEmulator,
  findEmulatorByName,
  hasCompatibleEmulator,
  waitForEmulatorReady,
} from '../../../../src/workflow/nodes/deployment/android/androidEmulatorUtils.js';
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
    it('should successfully fetch emulators using sf command', async () => {
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

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.emulators.length).toBe(2);
        expect(result.emulators[0].name).toBe('Pixel_8_API_34');
        expect(result.emulators[0].apiLevel).toBe(34);
        expect(result.emulators[0].isRunning).toBe(false);
        expect(result.emulators[1].name).toBe('Pixel_7_API_33');
        expect(result.emulators[1].apiLevel).toBe(33);
      }
    });

    it('should handle sf command failure', async () => {
      const sfDeviceListResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'sf: command not found',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(sfDeviceListResult);

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('sf: command not found');
      }
    });

    it('should handle invalid JSON output', async () => {
      const sfDeviceListResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'not valid json',
        stderr: '',
        success: true,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(sfDeviceListResult);

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to parse device list JSON');
      }
    });

    it('should handle empty device list', async () => {
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

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.emulators.length).toBe(0);
      }
    });

    it('should handle osVersion as string (no apiLevel extraction)', async () => {
      const sfDeviceListResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({
          outputContent: [
            {
              id: 'Custom_Device',
              name: 'Custom Device',
              deviceType: 'mobile',
              osType: 'google apis',
              osVersion: '33.0.0',
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

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.emulators.length).toBe(1);
        expect(result.emulators[0].name).toBe('Custom_Device');
        expect(result.emulators[0].apiLevel).toBeUndefined();
      }
    });

    it('should correctly apply minSdk filtering for compatibility', async () => {
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
              id: 'Pixel_7_API_30',
              name: 'Pixel 7 API 30',
              deviceType: 'mobile',
              osType: 'google apis',
              osVersion: { major: 30, minor: 0, patch: 0 },
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

      const result = await fetchAndroidEmulators(mockCommandRunner, mockLogger, { minSdk: 33 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.emulators.length).toBe(2);
        expect(result.emulators[0].isCompatible).toBe(true); // API 34 >= 33
        expect(result.emulators[1].isCompatible).toBe(false); // API 30 < 33
      }
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
