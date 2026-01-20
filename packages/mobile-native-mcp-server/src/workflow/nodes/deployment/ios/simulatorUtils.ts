/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { CommandRunner, Logger, ProgressReporter } from '@salesforce/magen-mcp-workflow';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Zod schema for a single simulator device from simctl JSON output
 */
export const SimulatorDeviceSchema = z.object({
  name: z.string(),
  udid: z.string(),
  state: z.string(),
  isAvailable: z.boolean().optional(),
  deviceTypeIdentifier: z.string().optional(),
  dataPath: z.string().optional(),
  dataPathSize: z.number().optional(),
  logPath: z.string().optional(),
  lastBootedAt: z.string().optional(),
});

/**
 * Zod schema for the full simctl list devices --json output
 */
export const SimctlDevicesOutputSchema = z.object({
  devices: z.record(z.string(), z.array(SimulatorDeviceSchema)),
});

export type SimulatorDevice = z.infer<typeof SimulatorDeviceSchema>;

/**
 * Extended simulator device info with runtime/iOS version extracted from the runtime key
 */
export interface SimulatorDeviceWithRuntime extends SimulatorDevice {
  runtimeIdentifier: string;
  iosVersion: string | null;
}

/**
 * Result type for fetchSimulatorDevices
 */
export type FetchSimulatorDevicesResult =
  | { success: true; devices: SimulatorDeviceWithRuntime[] }
  | { success: false; error: string };

/**
 * Fetches and parses the list of available iOS simulators using simctl JSON output.
 * Returns devices with their runtime information extracted.
 */
export async function fetchSimulatorDevices(
  commandRunner: CommandRunner,
  logger: Logger,
  options?: {
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<FetchSimulatorDevicesResult> {
  const result = await commandRunner.execute(
    'xcrun',
    ['simctl', 'list', 'devices', 'available', '--json'],
    {
      timeout: options?.timeout ?? 30000,
      progressReporter: options?.progressReporter,
      commandName: 'List iOS Simulators',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to list simulators: exit code ${result.exitCode ?? 'unknown'}`;
    return { success: false, error: errorMessage };
  }

  const devices = parseSimctlDevicesJson(result.stdout, logger);
  return { success: true, devices };
}

/**
 * Parses the JSON output from `simctl list devices --json` using Zod for safe parsing.
 * Extracts iOS version from the runtime identifier keys.
 */
export function parseSimctlDevicesJson(
  stdout: string,
  logger: Logger
): SimulatorDeviceWithRuntime[] {
  try {
    const jsonData: unknown = JSON.parse(stdout);
    const parseResult = SimctlDevicesOutputSchema.safeParse(jsonData);

    if (!parseResult.success) {
      logger.debug('Failed to validate simctl JSON output', {
        errors: parseResult.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return [];
    }

    // Flatten devices and attach runtime info
    const devices: SimulatorDeviceWithRuntime[] = [];

    for (const [runtimeIdentifier, runtimeDevices] of Object.entries(parseResult.data.devices)) {
      // Extract iOS version from runtime identifier like "com.apple.CoreSimulator.SimRuntime.iOS-18-0"
      const iosVersion = extractIOSVersion(runtimeIdentifier);

      for (const device of runtimeDevices) {
        devices.push({
          ...device,
          runtimeIdentifier,
          iosVersion,
        });
      }
    }

    return devices;
  } catch (error) {
    logger.debug('Failed to parse devices JSON', {
      error: error instanceof Error ? error.message : `${error}`,
    });
    return [];
  }
}

/**
 * Extracts iOS version from a runtime identifier.
 * e.g., "com.apple.CoreSimulator.SimRuntime.iOS-18-0" -> "18.0"
 */
export function extractIOSVersion(runtimeIdentifier: string): string | null {
  // Match patterns like "iOS-18-0" or "iOS-17-5"
  const match = runtimeIdentifier.match(/iOS-(\d+)-(\d+)/);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }
  return null;
}

/**
 * Parses version string (e.g., "18.0" or "17.5") to a comparable number.
 */
export function parseIOSVersionToNumber(version: string): number {
  const parts = version.split('.').map(Number);
  // Convert to comparable number: 18.0 -> 1800, 17.5 -> 1750
  return parts[0] * 1000 + (parts[1] || 0) * 10 + (parts[2] || 0);
}

/**
 * Finds a simulator by name from a list of devices.
 */
export function findSimulatorByName(
  devices: SimulatorDeviceWithRuntime[],
  name: string
): SimulatorDeviceWithRuntime | undefined {
  return devices.find(d => d.name === name);
}

/**
 * Selects the best simulator from the list.
 * Priority:
 * 1. Running simulator (state === 'Booted')
 * 2. Newest simulator (highest iOS version, then newest device model)
 */
export function selectBestSimulator(
  devices: SimulatorDeviceWithRuntime[],
  logger: Logger
): SimulatorDeviceWithRuntime | null {
  if (devices.length === 0) {
    return null;
  }

  // Priority 1: Find running simulator
  const runningSimulator = devices.find(d => d.state === 'Booted');
  if (runningSimulator) {
    logger.debug('Found running simulator', { name: runningSimulator.name });
    return runningSimulator;
  }

  // Priority 2: Find newest simulator (highest iOS version, then prefer newer device models)
  const sortedSimulators = [...devices].sort((a, b) => {
    const versionA = a.iosVersion ? parseIOSVersionToNumber(a.iosVersion) : 0;
    const versionB = b.iosVersion ? parseIOSVersionToNumber(b.iosVersion) : 0;
    if (versionB !== versionA) {
      return versionB - versionA; // Higher version first
    }
    // If same iOS version, prefer newer device models (higher numbers in name)
    return b.name.localeCompare(a.name);
  });

  const newestSimulator = sortedSimulators[0];
  logger.debug('Selected newest simulator', {
    name: newestSimulator.name,
    iosVersion: newestSimulator.iosVersion,
  });
  return newestSimulator;
}

/**
 * Verifies the simulator is actually responsive by running a simple command.
 * This catches cases where the simulator is "Booted" but not yet accepting commands.
 */
export async function verifySimulatorResponsive(
  commandRunner: CommandRunner,
  deviceName: string,
  progressReporter?: ProgressReporter
): Promise<boolean> {
  try {
    const result = await commandRunner.execute(
      'xcrun',
      ['simctl', 'spawn', deviceName, 'launchctl', 'print', 'system'],
      { timeout: 10000, progressReporter, commandName: 'Verify iOS Simulator Responsiveness' }
    );
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Waits for a simulator to be fully ready and responsive.
 * Polls the simulator state and verifies it's actually accepting commands.
 */
export async function waitForSimulatorReady(
  commandRunner: CommandRunner,
  logger: Logger,
  deviceName: string,
  options?: {
    progressReporter?: ProgressReporter;
    maxWaitTime?: number;
    pollInterval?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const maxWaitTime = options?.maxWaitTime ?? 120000;
  const pollInterval = options?.pollInterval ?? 2000;
  const startTime = Date.now();
  let lastError: string | undefined;

  logger.debug('Waiting for simulator to be ready', { deviceName, maxWaitTime });

  while (Date.now() - startTime < maxWaitTime) {
    const result = await fetchSimulatorDevices(commandRunner, logger, {
      progressReporter: options?.progressReporter,
      timeout: 10000,
    });

    if (!result.success) {
      lastError = result.error;
      logger.debug('Failed to list devices', { error: lastError });
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      continue;
    }

    const targetDevice = findSimulatorByName(result.devices, deviceName);

    if (targetDevice?.state === 'Booted') {
      // Verify simulator is actually responsive
      const isResponsive = await verifySimulatorResponsive(
        commandRunner,
        deviceName,
        options?.progressReporter
      );

      if (isResponsive) {
        logger.debug('Simulator is responsive and ready', {
          deviceName,
          elapsedMs: Date.now() - startTime,
        });
        return { success: true };
      }

      logger.debug('Simulator booted but not yet responsive, continuing to wait');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return {
    success: false,
    error: `Simulator "${deviceName}" did not become ready within ${maxWaitTime}ms. Last error: ${lastError ?? 'Unknown'}`,
  };
}

/**
 * Opens the Simulator.app GUI so the user can see the running simulator.
 * Note: `simctl boot` boots the simulator headless; this opens the visual window.
 * This is idempotent - if Simulator.app is already open, it just brings it to focus.
 */
export async function openSimulatorApp(
  commandRunner: CommandRunner,
  logger: Logger,
  progressReporter?: ProgressReporter
): Promise<void> {
  try {
    logger.debug('Opening Simulator.app GUI');

    const result = await commandRunner.execute('open', ['-a', 'Simulator'], {
      timeout: 10000,
      progressReporter,
      commandName: 'Open Simulator App',
    });

    if (!result.success) {
      // Non-fatal - simulator is still booted, user can open it manually
      logger.warn('Failed to open Simulator.app GUI', {
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
      return;
    }

    logger.debug('Simulator.app GUI opened successfully');
  } catch (error) {
    // Non-fatal - simulator is still booted, user can open it manually
    logger.warn('Error opening Simulator.app GUI', {
      error: error instanceof Error ? error.message : `${error}`,
    });
  }
}

/**
 * Reads bundle ID from the Xcode project file.
 * Reads PRODUCT_BUNDLE_IDENTIFIER from project.pbxproj file.
 * @throws Error if bundle ID cannot be found or read from the project file
 */
export async function readBundleIdFromProject(
  projectPath: string,
  logger: Logger
): Promise<string> {
  // Find the .xcodeproj directory
  let xcodeprojPath: string | null = null;
  try {
    const files = await readdir(projectPath);
    for (const file of files) {
      if (file.endsWith('.xcodeproj')) {
        xcodeprojPath = join(projectPath, file, 'project.pbxproj');
        break;
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to read project directory at ${projectPath}: ${error instanceof Error ? error.message : `${error}`}`
    );
  }

  if (!xcodeprojPath) {
    throw new Error(`No .xcodeproj directory found in project path: ${projectPath}`);
  }

  let content: string;
  try {
    content = await readFile(xcodeprojPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read project.pbxproj file at ${xcodeprojPath}: ${error instanceof Error ? error.message : `${error}`}`
    );
  }

  // Match PRODUCT_BUNDLE_IDENTIFIER patterns:
  // PRODUCT_BUNDLE_IDENTIFIER = "com.example.app";
  // PRODUCT_BUNDLE_IDENTIFIER = com.example.app;
  // PRODUCT_BUNDLE_IDENTIFIER = "com.example.${PRODUCT_NAME:rfc1034identifier}";
  const match = content.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*["']?([^"'\s;]+)["']?;/);
  if (!match || !match[1]) {
    throw new Error(`Could not find PRODUCT_BUNDLE_IDENTIFIER in project file: ${xcodeprojPath}`);
  }

  const bundleId = match[1];
  // Check if it contains unresolved variables (we can't resolve them here)
  if (bundleId.includes('${') || bundleId.includes('$(')) {
    throw new Error(
      `Bundle ID contains unresolved variables in project file ${xcodeprojPath}: ${bundleId}. The bundle identifier must be fully resolved.`
    );
  }

  logger.debug('Found bundle ID in project file', {
    file: xcodeprojPath,
    bundleId,
  });
  return bundleId;
}

/**
 * Result type for bootIOSSimulator
 */
export type BootIOSSimulatorResult =
  | { success: true; wasAlreadyBooted: boolean }
  | { success: false; error: string };

/**
 * Boots an iOS simulator using simctl.
 * Uses `xcrun simctl boot` command.
 * This function is idempotent - it treats "already booted" as success.
 */
export async function bootIOSSimulator(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    deviceName: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<BootIOSSimulatorResult> {
  const timeout = options.timeout ?? 60000; // 1 minute default

  logger.debug('Attempting to boot iOS simulator', { targetDevice: options.deviceName });

  const bootResult = await commandRunner.execute('xcrun', ['simctl', 'boot', options.deviceName], {
    timeout,
    progressReporter: options.progressReporter,
    commandName: 'Boot iOS Simulator',
  });

  // "Already booted" is success, not failure
  const isAlreadyBooted = bootResult.stderr?.includes(
    'Unable to boot device in current state: Booted'
  );

  if (!bootResult.success && !isAlreadyBooted) {
    const errorMessage = bootResult.stderr || `exit code ${bootResult.exitCode ?? 'unknown'}`;
    logger.error('Failed to boot simulator', new Error(errorMessage));
    logger.debug('Boot command details', {
      exitCode: bootResult.exitCode ?? null,
      signal: bootResult.signal ?? null,
      stderr: bootResult.stderr,
      stdout: bootResult.stdout,
    });
    return {
      success: false,
      error: `Failed to boot iOS simulator "${options.deviceName}": ${errorMessage}`,
    };
  }

  if (isAlreadyBooted) {
    logger.info('Simulator already booted, verifying responsiveness', {
      targetDevice: options.deviceName,
    });
  } else {
    logger.info('iOS simulator boot command completed', { targetDevice: options.deviceName });
  }

  return { success: true, wasAlreadyBooted: isAlreadyBooted };
}

/**
 * Result type for installIOSApp
 */
export type InstallIOSAppResult = { success: true } | { success: false; error: string };

/**
 * Installs an iOS app to a simulator using simctl.
 * Uses `xcrun simctl install` command.
 */
export async function installIOSApp(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    deviceName: string;
    appArtifactPath: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
  }
): Promise<InstallIOSAppResult> {
  const timeout = options.timeout ?? 120000; // 2 minutes default

  logger.debug('Installing iOS app to simulator', {
    targetDevice: options.deviceName,
    appArtifactPath: options.appArtifactPath,
  });

  const result = await commandRunner.execute(
    'xcrun',
    ['simctl', 'install', options.deviceName, options.appArtifactPath],
    {
      timeout,
      progressReporter: options.progressReporter,
      commandName: 'iOS App Installation',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to install app: exit code ${result.exitCode ?? 'unknown'}`;
    logger.error('Failed to install iOS app', new Error(errorMessage));
    logger.debug('Install command details', {
      exitCode: result.exitCode ?? null,
      signal: result.signal ?? null,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return {
      success: false,
      error: `Failed to install iOS app to simulator "${options.deviceName}": ${errorMessage}`,
    };
  }

  logger.info('iOS app installed successfully', {
    targetDevice: options.deviceName,
    appArtifactPath: options.appArtifactPath,
  });
  return { success: true };
}

/**
 * Result type for launchIOSApp
 */
export type LaunchIOSAppResult = { success: true } | { success: false; error: string };

/**
 * Launches an iOS app on a simulator using simctl.
 * Uses `xcrun simctl launch` command.
 */
export async function launchIOSApp(
  commandRunner: CommandRunner,
  logger: Logger,
  options: {
    deviceName: string;
    bundleId: string;
    progressReporter?: ProgressReporter;
    timeout?: number;
    postInstallDelayMs?: number;
  }
): Promise<LaunchIOSAppResult> {
  const timeout = options.timeout ?? 30000; // 30 seconds default

  logger.debug('Launching iOS app on simulator', {
    targetDevice: options.deviceName,
    bundleId: options.bundleId,
  });

  // Brief delay after install to ensure the app is ready to launch
  // Only apply delay if explicitly provided (e.g., when launching immediately after install)
  if (options.postInstallDelayMs !== undefined && options.postInstallDelayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, options.postInstallDelayMs));
  }

  const result = await commandRunner.execute(
    'xcrun',
    ['simctl', 'launch', options.deviceName, options.bundleId],
    {
      timeout,
      progressReporter: options.progressReporter,
      commandName: 'iOS App Launch',
    }
  );

  if (!result.success) {
    const errorMessage =
      result.stderr || `Failed to launch app: exit code ${result.exitCode ?? 'unknown'}`;
    logger.error('Failed to launch iOS app', new Error(errorMessage));
    logger.debug('Launch command details', {
      exitCode: result.exitCode ?? null,
      signal: result.signal ?? null,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return {
      success: false,
      error: `Failed to launch iOS app on simulator "${options.deviceName}": ${errorMessage}`,
    };
  }

  logger.info('iOS app launched successfully', {
    targetDevice: options.deviceName,
    bundleId: options.bundleId,
  });
  return { success: true };
}
