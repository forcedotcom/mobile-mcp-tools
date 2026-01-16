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
 * Zod schema for OS version from SF CLI output (can be string or object)
 */
const SFOsVersionSchema = z.union([
  z.string(),
  z.object({
    major: z.number(),
    minor: z.number(),
    patch: z.number(),
  }),
]);

/**
 * Zod schema for a single Android device from SF CLI output.
 * Based on the outputSchema from `sf force lightning local device list -p android --json`
 */
export const SFAndroidDeviceSchema = z.object({
  /** The ID of the device */
  id: z.string(),
  /** The name of the device */
  name: z.string(),
  /** The type of the device */
  deviceType: z.string(),
  /** The type of the operating system */
  osType: z.string(),
  /** The version of the operating system */
  osVersion: SFOsVersionSchema,
  /** Whether the android device has google Play Store enabled */
  isPlayStore: z.boolean().optional(),
  /** The port number the android device is running on */
  port: z.number().optional(),
});

export type SFAndroidDevice = z.infer<typeof SFAndroidDeviceSchema>;

/**
 * Zod schema for the SF CLI device list JSON output
 */
const SFDeviceListOutputSchema = z.object({
  outputSchema: z.unknown().optional(),
  outputContent: z.array(SFAndroidDeviceSchema),
});

/**
 * Fetches and parses the list of available Android emulators.
 * Uses `sf force lightning local device list -p android --json` command.
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

  // Use SF CLI to list Android devices
  const result = await commandRunner.execute(
    'sf',
    ['force', 'lightning', 'local', 'device', 'list', '-p', 'android', '--json', '-o', 'all'],
    {
      timeout,
      progressReporter: options?.progressReporter,
      commandName: 'List Android Devices',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to list Android devices: exit code ${result.exitCode ?? 'unknown'}`;
    return { success: false, error: errorMessage };
  }

  // Parse and validate JSON output using Zod schema
  let devices: SFAndroidDevice[];
  try {
    const jsonData = JSON.parse(result.stdout);
    const parsed = SFDeviceListOutputSchema.parse(jsonData);
    devices = parsed.outputContent;
  } catch (parseError) {
    const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
    logger.error('Failed to parse SF CLI JSON output', new Error(errorMsg));
    return { success: false, error: `Failed to parse device list JSON: ${errorMsg}` };
  }
  if (!devices || devices.length === 0) {
    logger.debug('No Android devices found');
    return { success: true, emulators: [] };
  }

  // Map SF CLI output to AndroidEmulatorDeviceWithMetadata
  const emulators: AndroidEmulatorDeviceWithMetadata[] = devices.map(device => {
    // Extract API level from osVersion (use major version if object, otherwise undefined)
    const apiLevel = typeof device.osVersion === 'object' ? device.osVersion.major : undefined;

    return {
      name: device.id, // Use id as the device name for emulator commands
      apiLevel,
      // Note: We no longer check if the emulator is running since we are using the SF CLI to start the emulator. Once the emulator is selected, sf command can start it regardless of its state.
      isRunning: false, // Cannot be inferred from SF CLI output
      isCompatible: apiLevel === undefined ? true : apiLevel >= minSdk,
    };
  });

  logger.debug('Parsed Android emulators from SF CLI', {
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
    commandName: 'Wait for Android Emulator',
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
        commandName: 'Check Android Emulator Boot Status',
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
