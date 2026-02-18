/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { AndroidUtils, Version } from '@salesforce/lwc-dev-mobile-core';
import type { Logger } from '@salesforce/magen-mcp-workflow';

/** Logger type expected by @salesforce/lwc-dev-mobile-core (from @salesforce/core). Pass-through for compatibility. */
type CoreLogger = Parameters<typeof AndroidUtils.fetchInstalledPackages>[0];

/**
 * `sf force lightning local setup --json` is called to check android platform sdk setup.
 * These titles are defined in in lwc-dev-mobile-core.
 * Below two items with such defined title are skipped.
 */
export const ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP: readonly string[] = [
  'Checking SDK Platform API', // defined at https://github.com/forcedotcom/lwc-dev-mobile-core/blob/ac64e7b40782b75da0c28a086ca046e7558fa789/src/common/AndroidEnvironmentRequirements.ts#L154
  'Checking SDK Platform Emulator Images', //https://github.com/forcedotcom/lwc-dev-mobile-core/blob/ac64e7b40782b75da0c28a086ca046e7558fa789/src/common/AndroidEnvironmentRequirements.ts#L195
];

export type RequirementTestResult = {
  title: string;
  hasPassed: boolean;
  duration?: string;
  message: string;
};

/**
 * Filters out failed Android setup requirement checks that we replace with a direct
 * platform/emulator image >= apiLevel check. Only failures with the skip titles are excluded.
 *
 * @param tests - Individual requirement check results from setup command JSON
 * @param command - The setup command string (for error message context)
 * @returns Filtered failure messages and whether all other requirements passed
 */
export function filterAndroidSetupFailures(
  tests: RequirementTestResult[],
  command: string
): { filteredErrorMessages: string[]; allOtherRequirementsMet: boolean } {
  const failedTests = tests.filter(test => !test.hasPassed);
  const filteredFailures = failedTests.filter(
    test => !ANDROID_SETUP_REQUIREMENT_TITLES_TO_SKIP.includes(test.title)
  );
  const filteredErrorMessages = filteredFailures.map(
    test => `Platform setup check for "${command}" failed: ${test.message}`
  );
  const allOtherRequirementsMet = filteredErrorMessages.length === 0;
  return { filteredErrorMessages, allOtherRequirementsMet };
}

/**
 * Result of the direct Android platform and emulator image check.
 */
export type AndroidDirectCheckResult = {
  success: boolean;
  errorMessage?: string;
};

/**
 * Runs the direct Android level check: (1) at least one platform package with version >= apiLevel,
 * (2) at least one system image (emulator image) with version >= apiLevel.
 * Uses fetchInstalledPackages only; we do not call fetchSupportedEmulatorImagePackage(apiLevel)
 * because it uses exact match (Version.same), not >=. Uses PLATFORM_API_LEVELS.Android (or
 * caller-provided apiLevel); do not hardcode the level.
 *
 * @param apiLevel - Minimum API level (e.g. from PLATFORM_API_LEVELS.Android)
 * @param logger - Optional logger (passed to AndroidUtils; may be undefined if types differ)
 * @returns Promise with success flag and optional error message
 */
export async function checkAndroidPlatformAndEmulatorImage(
  apiLevel: string,
  logger?: Logger
): Promise<AndroidDirectCheckResult> {
  const minVersion = Version.from(apiLevel);
  if (minVersion === null) {
    return {
      success: false,
      errorMessage: `Android API level "${apiLevel}" is not a valid version format.`,
    };
  }

  const versionAtLeast = (pkg: { version: Version | string }) => {
    return Version.sameOrNewer(pkg.version, minVersion);
  };

  try {
    // fetchInstalledPackages gives both platforms and systemImages.
    const packages = await AndroidUtils.fetchInstalledPackages(logger as CoreLogger);

    // Check if at least one platform package with version >= apiLevel is installed.
    const hasPlatformAtLeast = packages.platforms.some(versionAtLeast);
    if (!hasPlatformAtLeast) {
      return {
        success: false,
        errorMessage: `Android platform API for level ${apiLevel} or higher is required. No installed platform package found with version >= ${apiLevel}.`,
      };
    }

    // Check if at least one system image (emulator image) with version >= apiLevel is installed.
    const hasEmulatorImageAtLeast = packages.systemImages.some(versionAtLeast);
    if (!hasEmulatorImageAtLeast) {
      return {
        success: false,
        errorMessage: `Android emulator image for level ${apiLevel} or higher is required. No installed emulator image found with version >= ${apiLevel}.`,
      };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errorMessage: `Android platform API and emulator image for level ${apiLevel} or higher is required. ${message}`,
    };
  }
}
