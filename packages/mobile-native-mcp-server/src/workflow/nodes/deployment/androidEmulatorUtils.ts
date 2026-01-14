/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { CommandRunner, Logger, ProgressReporter } from '@salesforce/magen-mcp-workflow';

/**
 * Zod schema for an Android emulator device
 */
export const AndroidEmulatorDeviceSchema = z.object({
  name: z.string(),
  apiLevel: z.number().optional(),
  isRunning: z.boolean(),
});

export type AndroidEmulatorDevice = z.infer<typeof AndroidEmulatorDeviceSchema>;

/**
 * Extended emulator device info with additional metadata
 */
export interface AndroidEmulatorDeviceWithMetadata extends AndroidEmulatorDevice {
  /**
   * Whether this emulator is compatible with the app's minSdk
   */
  isCompatible: boolean;
}

/**
 * Result type for fetchAndroidEmulators
 */
export type FetchAndroidEmulatorsResult =
  | { success: true; emulators: AndroidEmulatorDeviceWithMetadata[] }
  | { success: false; error: string };

/**
 * Fetches and parses the list of available Android emulators.
 * Uses `emulator -list-avds` for available emulators and `adb devices` for running state.
 */
export async function fetchAndroidEmulators(
  commandRunner: CommandRunner,
  logger: Logger,
  options?: {
    progressReporter?: ProgressReporter;
    timeout?: number;
    minSdk?: number;
  }
): Promise<FetchAndroidEmulatorsResult> {
  const timeout = options?.timeout ?? 30000;
  const minSdk = options?.minSdk ?? 0;

  // First, get the list of available AVDs using emulator command
  const avdListResult = await commandRunner.execute('emulator', ['-list-avds'], {
    timeout,
    progressReporter: options?.progressReporter,
  });

  if (!avdListResult.success) {
    // Try fallback using avdmanager
    const avdManagerResult = await commandRunner.execute('avdmanager', ['list', 'avd', '-c'], {
      timeout,
      progressReporter: options?.progressReporter,
    });

    if (!avdManagerResult.success) {
      const errorMessage =
        avdListResult.stderr ||
        avdManagerResult.stderr ||
        `Failed to list emulators: exit code ${avdListResult.exitCode ?? 'unknown'}`;
      return { success: false, error: errorMessage };
    }

    return parseEmulatorListAndEnrich(
      avdManagerResult.stdout,
      commandRunner,
      logger,
      minSdk,
      options
    );
  }

  return parseEmulatorListAndEnrich(avdListResult.stdout, commandRunner, logger, minSdk, options);
}

/**
 * Parses the emulator list output and enriches with running state
 */
async function parseEmulatorListAndEnrich(
  stdout: string,
  commandRunner: CommandRunner,
  logger: Logger,
  minSdk: number,
  options?: {
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<FetchAndroidEmulatorsResult> {
  const timeout = options?.timeout ?? 30000;

  // Parse emulator names from output (one per line)
  const emulatorNames = stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('INFO'));

  if (emulatorNames.length === 0) {
    logger.debug('No emulators found');
    return { success: true, emulators: [] };
  }

  // Get running emulator list from adb
  const runningEmulators = await getRunningEmulators(
    commandRunner,
    logger,
    timeout,
    options?.progressReporter
  );

  // Build emulator device list with metadata
  const emulators: AndroidEmulatorDeviceWithMetadata[] = emulatorNames.map(name => {
    // Extract API level from emulator name (e.g., "pixel-28" -> 28)
    const apiLevel = extractApiLevelFromName(name);

    return {
      name,
      apiLevel,
      isRunning: runningEmulators.includes(name) || runningEmulators.length > 0,
      isCompatible: apiLevel !== undefined ? apiLevel >= minSdk : true,
    };
  });

  logger.debug('Parsed Android emulators', {
    count: emulators.length,
    emulators: emulators.map(e => ({
      name: e.name,
      apiLevel: e.apiLevel,
      isRunning: e.isRunning,
      isCompatible: e.isCompatible,
    })),
  });

  return { success: true, emulators };
}

/**
 * Gets the list of running emulators from adb devices
 */
async function getRunningEmulators(
  commandRunner: CommandRunner,
  logger: Logger,
  timeout: number,
  progressReporter?: ProgressReporter
): Promise<string[]> {
  const result = await commandRunner.execute('adb', ['devices'], {
    timeout,
    progressReporter,
  });

  if (!result.success) {
    logger.debug('Failed to get running emulators from adb', {
      stderr: result.stderr,
    });
    return [];
  }

  // Parse adb devices output:
  // List of devices attached
  // emulator-5554   device
  const lines = result.stdout.split('\n');
  const runningDevices: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('emulator-') && trimmed.includes('device')) {
      // Get the emulator serial (e.g., "emulator-5554")
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        runningDevices.push(parts[0]);
      }
    }
  }

  logger.debug('Found running emulators', { runningDevices });
  return runningDevices;
}

/**
 * Extracts API level from emulator name.
 * Handles patterns like:
 * - "pixel-28" -> 28
 * - "Pixel_3a_API_30" -> 30
 * - "Nexus_5X_API_28_x86" -> 28
 */
export function extractApiLevelFromName(name: string): number | undefined {
  // Try pattern: "pixel-28" or similar with hyphen
  const hyphenMatch = name.match(/-(\d+)$/);
  if (hyphenMatch) {
    return parseInt(hyphenMatch[1], 10);
  }

  // Try pattern: "API_28" or "API28"
  const apiMatch = name.match(/API[_]?(\d+)/i);
  if (apiMatch) {
    return parseInt(apiMatch[1], 10);
  }

  return undefined;
}

/**
 * Selects the best emulator from the list.
 * Priority:
 * 1. Running emulator that is compatible
 * 2. Compatible emulator with highest API level
 * 3. Any emulator (fallback)
 */
export function selectBestEmulator(
  emulators: AndroidEmulatorDeviceWithMetadata[],
  logger: Logger
): AndroidEmulatorDeviceWithMetadata | null {
  if (emulators.length === 0) {
    return null;
  }

  // Priority 1: Find running compatible emulator
  const runningCompatible = emulators.find(e => e.isRunning && e.isCompatible);
  if (runningCompatible) {
    logger.debug('Found running compatible emulator', { name: runningCompatible.name });
    return runningCompatible;
  }

  // Priority 2: Find any running emulator
  const running = emulators.find(e => e.isRunning);
  if (running) {
    logger.debug('Found running emulator (may not be compatible)', { name: running.name });
    return running;
  }

  // Priority 3: Find compatible emulator with highest API level
  const compatibleSorted = emulators
    .filter(e => e.isCompatible)
    .sort((a, b) => (b.apiLevel ?? 0) - (a.apiLevel ?? 0));

  if (compatibleSorted.length > 0) {
    const best = compatibleSorted[0];
    logger.debug('Selected compatible emulator with highest API level', {
      name: best.name,
      apiLevel: best.apiLevel,
    });
    return best;
  }

  // Priority 4: Any emulator (fallback)
  const sortedByApiLevel = [...emulators].sort((a, b) => (b.apiLevel ?? 0) - (a.apiLevel ?? 0));
  const fallback = sortedByApiLevel[0];
  logger.debug('Selected fallback emulator', {
    name: fallback.name,
    apiLevel: fallback.apiLevel,
  });
  return fallback;
}

/**
 * Finds an emulator by name from a list of devices.
 */
export function findEmulatorByName(
  emulators: AndroidEmulatorDeviceWithMetadata[],
  name: string
): AndroidEmulatorDeviceWithMetadata | undefined {
  return emulators.find(e => e.name === name);
}

/**
 * Checks if any emulator exists that is compatible with the given minSdk.
 */
export function hasCompatibleEmulator(
  emulators: AndroidEmulatorDeviceWithMetadata[],
  minSdk: number
): boolean {
  return emulators.some(e => e.apiLevel !== undefined && e.apiLevel >= minSdk);
}

/**
 * Waits for an emulator to be fully booted and responsive.
 * Uses `adb wait-for-device` and then verifies boot completion.
 */
export async function waitForEmulatorReady(
  commandRunner: CommandRunner,
  logger: Logger,
  options?: {
    progressReporter?: ProgressReporter;
    maxWaitTime?: number;
    pollInterval?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const maxWaitTime = options?.maxWaitTime ?? 120000;
  const pollInterval = options?.pollInterval ?? 3000;
  const startTime = Date.now();

  logger.debug('Waiting for emulator to be ready', { maxWaitTime });

  // First, wait for device to be available
  const waitResult = await commandRunner.execute('adb', ['wait-for-device'], {
    timeout: Math.min(60000, maxWaitTime),
    progressReporter: options?.progressReporter,
  });

  if (!waitResult.success) {
    return {
      success: false,
      error: `adb wait-for-device failed: ${waitResult.stderr || 'unknown error'}`,
    };
  }

  // Then poll for boot completion
  while (Date.now() - startTime < maxWaitTime) {
    const bootResult = await commandRunner.execute(
      'adb',
      ['shell', 'getprop', 'sys.boot_completed'],
      {
        timeout: 10000,
        progressReporter: options?.progressReporter,
      }
    );

    if (bootResult.success && bootResult.stdout.trim() === '1') {
      logger.debug('Emulator boot completed', {
        elapsedMs: Date.now() - startTime,
      });
      return { success: true };
    }

    logger.debug('Waiting for emulator boot completion...', {
      bootCompleted: bootResult.stdout.trim(),
      elapsedMs: Date.now() - startTime,
    });

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return {
    success: false,
    error: `Emulator did not become ready within ${maxWaitTime}ms`,
  };
}
