/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP,
  filterAndroidSetupFailures,
  checkAndroidPlatformAndEmulatorImage,
  type RequirementTestResult,
} from '../../../src/workflow/utils/androidPlatformCheck.js';
import { AndroidUtils, Version } from '@salesforce/lwc-dev-mobile-core';

vi.mock('@salesforce/lwc-dev-mobile-core', () => ({
  AndroidUtils: {
    fetchInstalledPackages: vi.fn(),
    fetchSupportedEmulatorImagePackage: vi.fn(),
  },
  Version: {
    from: vi.fn(),
    sameOrNewer: vi.fn(),
  },
}));

describe('androidPlatformCheck', () => {
  const mockLogger = undefined;

  beforeEach(() => {
    vi.mocked(AndroidUtils.fetchInstalledPackages).mockReset();
    vi.mocked(AndroidUtils.fetchSupportedEmulatorImagePackage).mockReset();
    vi.mocked(Version.from).mockReset();
    vi.mocked(Version.sameOrNewer).mockReset();
  });

  describe('ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP', () => {
    it('includes the two expected requirement titles', () => {
      expect(ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP).toContain('Checking SDK Platform API');
      expect(ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP).toContain(
        'Checking SDK Platform Emulator Images'
      );
      expect(ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP).toHaveLength(2);
    });
  });

  describe('filterAndroidSetupFailures', () => {
    const command = 'sf force lightning local setup -p android -l 35 --json';

    it('returns empty filtered errors and allOtherRequirementsMet true when no failures', () => {
      const tests: RequirementTestResult[] = [
        { title: 'Node.js Version Check', hasPassed: true, message: 'OK' },
        { title: 'Checking SDK Platform API', hasPassed: true, message: 'OK' },
      ];
      const result = filterAndroidSetupFailures(tests, command);
      expect(result.filteredErrorMessages).toHaveLength(0);
      expect(result.allOtherRequirementsMet).toBe(true);
    });

    it('excludes failed tests with skip titles from filtered errors', () => {
      const tests: RequirementTestResult[] = [
        { title: 'Node.js Version Check', hasPassed: true, message: 'OK' },
        { title: 'Checking SDK Platform API', hasPassed: false, message: 'No API 35' },
        { title: 'Checking SDK Platform Emulator Images', hasPassed: false, message: 'No image' },
      ];
      const result = filterAndroidSetupFailures(tests, command);
      expect(result.filteredErrorMessages).toHaveLength(0);
      expect(result.allOtherRequirementsMet).toBe(true);
    });

    it('includes failed tests with other titles in filtered errors', () => {
      const tests: RequirementTestResult[] = [
        { title: 'Node.js Version Check', hasPassed: false, message: 'Too old' },
        { title: 'Checking SDK Platform API', hasPassed: false, message: 'Skipped' },
      ];
      const result = filterAndroidSetupFailures(tests, command);
      expect(result.filteredErrorMessages).toHaveLength(1);
      expect(result.filteredErrorMessages[0]).toContain('Too old');
      expect(result.filteredErrorMessages[0]).toContain(command);
      expect(result.allOtherRequirementsMet).toBe(false);
    });
  });

  describe('checkAndroidPlatformAndEmulatorImage', () => {
    it('returns error when apiLevel is invalid version format', async () => {
      vi.mocked(Version.from).mockReturnValue(null);
      const result = await checkAndroidPlatformAndEmulatorImage('invalid', mockLogger);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('valid version format');
      expect(AndroidUtils.fetchInstalledPackages).not.toHaveBeenCalled();
    });

    it('returns error when no platform >= apiLevel', async () => {
      const minVersion = { major: 35, minor: 0, patch: 0 };
      vi.mocked(Version.from).mockReturnValue(minVersion as ReturnType<typeof Version.from>);
      vi.mocked(AndroidUtils.fetchInstalledPackages).mockResolvedValue({
        platforms: [{ version: { major: 34, minor: 0, patch: 0 } }],
        systemImages: [],
        isEmpty: () => false,
        toString: () => '',
      } as Awaited<ReturnType<typeof AndroidUtils.fetchInstalledPackages>>);
      vi.mocked(Version.sameOrNewer).mockReturnValue(false);

      const result = await checkAndroidPlatformAndEmulatorImage('35', mockLogger);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('level 35 or higher');
    });

    it('returns success when platform and system image >= apiLevel', async () => {
      const minVersion = { major: 35, minor: 0, patch: 0 };
      vi.mocked(Version.from).mockReturnValue(minVersion as ReturnType<typeof Version.from>);
      vi.mocked(AndroidUtils.fetchInstalledPackages).mockResolvedValue({
        platforms: [{ version: minVersion }],
        systemImages: [{ version: minVersion }],
        isEmpty: () => false,
        toString: () => '',
      } as Awaited<ReturnType<typeof AndroidUtils.fetchInstalledPackages>>);
      vi.mocked(Version.sameOrNewer).mockReturnValue(true);

      const result = await checkAndroidPlatformAndEmulatorImage('35', mockLogger);
      expect(result.success).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(AndroidUtils.fetchSupportedEmulatorImagePackage).not.toHaveBeenCalled();
    });

    it('returns error when no system image >= apiLevel', async () => {
      const minVersion = { major: 35, minor: 0, patch: 0 };
      vi.mocked(Version.from).mockReturnValue(minVersion as ReturnType<typeof Version.from>);
      vi.mocked(AndroidUtils.fetchInstalledPackages).mockResolvedValue({
        platforms: [{ version: minVersion }],
        systemImages: [],
        isEmpty: () => false,
        toString: () => '',
      } as Awaited<ReturnType<typeof AndroidUtils.fetchInstalledPackages>>);
      vi.mocked(Version.sameOrNewer).mockReturnValue(true);

      const result = await checkAndroidPlatformAndEmulatorImage('35', mockLogger);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('level 35 or higher');
      expect(result.errorMessage).toContain('No installed emulator image');
    });
  });
});
