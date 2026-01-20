/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { CommandRunner, Logger, ProgressReporter } from '@salesforce/magen-mcp-workflow';

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
