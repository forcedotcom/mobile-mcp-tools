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
  readApplicationIdFromGradle,
  readLaunchActivityFromManifest,
} from '../../../../src/workflow/nodes/deployment/androidEmulatorUtils.js';
import { readFileSync } from 'node:fs';

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});
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
    vi.mocked(readFileSync).mockReset();
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

  describe('readApplicationIdFromGradle', () => {
    it('should read applicationId from build.gradle', () => {
      vi.mocked(readFileSync).mockReturnValueOnce('applicationId = "com.test.app"');

      const result = readApplicationIdFromGradle('/path/to/project', mockLogger);

      expect(result).toBe('com.test.app');
      expect(mockLogger.hasLoggedMessage('Found applicationId in build.gradle', 'debug')).toBe(
        true
      );
    });

    it('should read applicationId from build.gradle.kts', () => {
      vi.mocked(readFileSync)
        .mockImplementationOnce(() => {
          throw new Error('File not found');
        })
        .mockReturnValueOnce('applicationId = "com.test.kts.app"');

      const result = readApplicationIdFromGradle('/path/to/project', mockLogger);

      expect(result).toBe('com.test.kts.app');
    });

    it('should return undefined when no applicationId found', () => {
      vi.mocked(readFileSync).mockReturnValueOnce('// no applicationId here');

      const result = readApplicationIdFromGradle('/path/to/project', mockLogger);

      expect(result).toBeUndefined();
    });

    it('should return undefined when files cannot be read', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = readApplicationIdFromGradle('/path/to/project', mockLogger);

      expect(result).toBeUndefined();
    });

    it('should handle applicationId with colon syntax', () => {
      vi.mocked(readFileSync).mockReturnValueOnce('applicationId: "com.test.app"');

      const result = readApplicationIdFromGradle('/path/to/project', mockLogger);

      expect(result).toBe('com.test.app');
    });
  });

  describe('readLaunchActivityFromManifest', () => {
    it('should read launcher activity from AndroidManifest.xml', () => {
      vi.mocked(readFileSync).mockReturnValueOnce(`
        <activity android:name=".MainActivity">
          <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
          </intent-filter>
        </activity>
      `);

      const result = readLaunchActivityFromManifest('/path/to/project', mockLogger);

      expect(result).toBe('.MainActivity');
      expect(
        mockLogger.hasLoggedMessage('Found launcher activity in AndroidManifest.xml', 'debug')
      ).toBe(true);
    });

    it('should handle activity with name after other attributes', () => {
      vi.mocked(readFileSync).mockReturnValueOnce(`
        <activity android:exported="true" android:name=".MainActivity">
          <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
          </intent-filter>
        </activity>
      `);

      const result = readLaunchActivityFromManifest('/path/to/project', mockLogger);

      expect(result).toBeDefined();
    });

    it('should return undefined when no launcher activity found', () => {
      vi.mocked(readFileSync).mockReturnValueOnce(`
        <activity android:name=".OtherActivity">
          <intent-filter>
            <action android:name="android.intent.action.VIEW" />
          </intent-filter>
        </activity>
      `);

      const result = readLaunchActivityFromManifest('/path/to/project', mockLogger);

      expect(result).toBeUndefined();
    });

    it('should return undefined when manifest cannot be read', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = readLaunchActivityFromManifest('/path/to/project', mockLogger);

      expect(result).toBeUndefined();
    });
  });
});
