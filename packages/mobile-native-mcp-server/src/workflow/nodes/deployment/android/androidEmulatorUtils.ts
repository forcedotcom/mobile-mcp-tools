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

/**
 * Result type for createAndroidEmulator
 */
export type CreateAndroidEmulatorResult =
  | { success: true; emulatorName: string }
  | { success: false; error: string };

/**
 * Creates an Android emulator using the SF CLI.
 * Uses `sf force lightning local device create` command.
 */
export async function createAndroidEmulator(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    emulatorName: string;
    apiLevel: string;
    projectPath?: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<CreateAndroidEmulatorResult> {
  const timeout = options.timeout ?? 300000; // 5 minutes default

  logger.info('Creating Android emulator', {
    emulatorName: options.emulatorName,
    apiLevel: options.apiLevel,
  });

  const result = await commandRunner.execute(
    'sf',
    [
      'force',
      'lightning',
      'local',
      'device',
      'create',
      '-n',
      options.emulatorName,
      '-d',
      'pixel',
      '-p',
      'android',
      '-l',
      options.apiLevel,
    ],
    {
      timeout,
      cwd: options.projectPath,
      progressReporter: options.progressReporter,
      commandName: 'Create Android Emulator',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to create emulator: exit code ${result.exitCode ?? 'unknown'}`;
    logger.error('Failed to create Android emulator', new Error(errorMessage));
    logger.debug('Create emulator command details', {
      exitCode: result.exitCode ?? null,
      signal: result.signal ?? null,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return {
      success: false,
      error: `Failed to create Android emulator "${options.emulatorName}": ${errorMessage}`,
    };
  }

  logger.info('Android emulator created successfully', { emulatorName: options.emulatorName });
  return { success: true, emulatorName: options.emulatorName };
}

/**
 * Result type for installAndroidApp
 */
export type InstallAndroidAppResult = { success: true } | { success: false; error: string };

/**
 * Installs an Android app using the SF CLI.
 * Uses `sf force lightning local app install` command.
 */
export async function installAndroidApp(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    apkPath: string;
    targetDevice: string;
    projectPath?: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<InstallAndroidAppResult> {
  const timeout = options.timeout ?? 300000; // 5 minutes default

  logger.debug('Installing Android app using sf CLI', {
    projectPath: options.projectPath,
    targetDevice: options.targetDevice,
    apkPath: options.apkPath,
  });

  const result = await commandRunner.execute(
    'sf',
    [
      'force',
      'lightning',
      'local',
      'app',
      'install',
      '-p',
      'android',
      '-t',
      options.targetDevice,
      '-a',
      options.apkPath,
    ],
    {
      timeout,
      cwd: options.projectPath,
      progressReporter: options.progressReporter,
      commandName: 'Android App Installation',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to install app: exit code ${result.exitCode ?? 'unknown'}`;
    logger.error('Failed to install Android app', new Error(errorMessage));
    logger.debug('Install command details', {
      exitCode: result.exitCode ?? null,
      signal: result.signal ?? null,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return {
      success: false,
      error: `Failed to install Android app: ${errorMessage}`,
    };
  }

  logger.info('Android app installed successfully', {
    targetDevice: options.targetDevice,
    apkPath: options.apkPath,
  });
  return { success: true };
}

/**
 * Result type for launchAndroidApp
 */
export type LaunchAndroidAppResult = { success: true } | { success: false; error: string };

/**
 * Launches an Android app using the SF CLI.
 * Uses `sf force lightning local app launch` command.
 */
export async function launchAndroidApp(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    launchIntent: string;
    targetDevice: string;
    applicationId: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<LaunchAndroidAppResult> {
  const timeout = options.timeout ?? 30000; // 30 seconds default

  logger.debug('Launching Android app', {
    applicationId: options.applicationId,
    targetDevice: options.targetDevice,
    launchIntent: options.launchIntent,
  });

  const result = await commandRunner.execute(
    'sf',
    [
      'force',
      'lightning',
      'local',
      'app',
      'launch',
      '-p',
      'android',
      '-t',
      options.targetDevice,
      '-i',
      options.launchIntent,
    ],
    {
      timeout,
      progressReporter: options.progressReporter,
      commandName: 'Android App Launch',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to launch app: exit code ${result.exitCode ?? 'unknown'}`;
    logger.error('Failed to launch Android app', new Error(errorMessage));
    logger.debug('Launch command details', {
      exitCode: result.exitCode ?? null,
      signal: result.signal ?? null,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return {
      success: false,
      error: `Failed to launch Android app "${options.applicationId}": ${errorMessage}`,
    };
  }

  logger.info('Android app launched successfully', {
    applicationId: options.applicationId,
    targetDevice: options.targetDevice,
  });
  return { success: true };
}

/**
 * Result type for startAndroidEmulator
 */
export type StartAndroidEmulatorResult =
  | { success: true; wasAlreadyRunning: boolean }
  | { success: false; error: string };

/**
 * Starts an Android emulator using the SF CLI.
 * Uses `sf force lightning local device start` command.
 * This function is idempotent - it treats "already running" as success.
 */
export async function startAndroidEmulator(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    emulatorName: string;
    projectPath?: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<StartAndroidEmulatorResult> {
  const timeout = options.timeout ?? 120000; // 2 minutes default

  logger.debug('Starting Android emulator', { emulatorName: options.emulatorName });

  const result = await commandRunner.execute(
    'sf',
    ['force', 'lightning', 'local', 'device', 'start', '-p', 'android', '-t', options.emulatorName],
    {
      timeout,
      cwd: options.projectPath,
      progressReporter: options.progressReporter,
      commandName: 'Start Android Emulator',
    }
  );

  // Check if it's already running - this is SUCCESS, not failure
  const isAlreadyRunning =
    result.stderr?.includes('already running') ||
    result.stdout?.includes('already running') ||
    result.stderr?.includes('already booted');

  if (!result.success && !isAlreadyRunning) {
    const errorMessage =
      result.stderr || `Failed to start emulator: exit code ${result.exitCode ?? 'unknown'}`;
    logger.error('Failed to start Android emulator', new Error(errorMessage));
    logger.debug('Start emulator command details', {
      exitCode: result.exitCode ?? null,
      signal: result.signal ?? null,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return {
      success: false,
      error: `Failed to start Android emulator "${options.emulatorName}": ${errorMessage}`,
    };
  }

  if (isAlreadyRunning) {
    logger.info('Emulator already running, verifying responsiveness', {
      emulatorName: options.emulatorName,
    });
  } else {
    logger.info('Android emulator start command completed', {
      emulatorName: options.emulatorName,
    });
  }

  return { success: true, wasAlreadyRunning: isAlreadyRunning };
}
