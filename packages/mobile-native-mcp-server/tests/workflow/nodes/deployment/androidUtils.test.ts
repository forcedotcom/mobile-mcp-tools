/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readApplicationIdFromGradle,
  readLaunchActivityFromManifest,
} from '../../../../src/workflow/nodes/deployment/android/androidUtils.js';
import { readFileSync } from 'node:fs';

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});
import { MockLogger } from '../../../utils/MockLogger.js';

describe('androidUtils', () => {
  const mockLogger = new MockLogger();

  beforeEach(() => {
    vi.mocked(readFileSync).mockReset();
    mockLogger.reset();
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
