/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  BaseNode,
  createComponentLogger,
  Logger,
  CommandRunner,
  WorkflowRunnableConfig,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../../metadata.js';

/**
 * Determines and selects the target iOS simulator device.
 * Selection priority:
 * 1. Use targetDevice if already set in state
 * 2. Use running simulator if available
 * 3. Use newest simulator as fallback
 *
 * TODO: Implement smart selection based on app requirements:
 * - Read IPHONEOS_DEPLOYMENT_TARGET from project.pbxproj to match minimum iOS version
 * - Read TARGETED_DEVICE_FAMILY to prefer iPhone/iPad/visionOS simulators
 * - Filter simulators to only those compatible with the app's deployment target
 */
export class iOSSelectSimulatorNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('iosSelectSimulator');
    this.logger = logger ?? createComponentLogger('iOSSelectSimulatorNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping iOS simulator selection for non-iOS platform');
      return {};
    }

    // If targetDevice is already set, use it
    if (state.targetDevice) {
      this.logger.debug('Target device already set', { targetDevice: state.targetDevice });
      return {};
    }

    try {
      this.logger.debug('Selecting iOS simulator device');

      const progressReporter = config?.configurable?.progressReporter;

      // List all available simulators
      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'list', 'devices', 'available'],
        {
          timeout: 30000,
          progressReporter,
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to list simulators: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to list iOS simulators', new Error(errorMessage));
        this.logger.debug('List devices command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [
            `Failed to list iOS simulators: ${errorMessage}. Please ensure Xcode is properly installed.`,
          ],
        };
      }

      // Parse simulator list and find the best match
      const selectedDevice = this.selectSimulator(result.stdout);

      if (!selectedDevice) {
        this.logger.warn('No simulators found');
        return {
          workflowFatalErrorMessages: [
            'No iOS simulators found. Please install simulators via Xcode.',
          ],
        };
      }

      this.logger.info('Selected iOS simulator', { targetDevice: selectedDevice });
      return { targetDevice: selectedDevice };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error selecting iOS simulator',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [
          `Failed to select iOS simulator: ${errorMessage}. Please ensure Xcode is properly installed.`,
        ],
      };
    }
  };

  /**
   * Selects the best simulator from the list.
   * Priority:
   * 1. Running simulator (if any)
   * 2. Newest simulator (highest iOS version, then newest device model)
   */
  private selectSimulator(output: string): string | null {
    // Parse the simulator list output
    // Format is typically:
    // -- iOS 18.0 --
    //     iPhone 16 Pro Max (ABC12345-1234-1234-1234-123456789ABC) (Shutdown)
    //     iPhone 15 Pro (DEF67890-5678-5678-5678-567890123DEF) (Booted)
    // -- iOS 17.0 --
    //     iPhone 14 Pro (GHI90123-9012-9012-9012-901234567GHI) (Shutdown)
    const lines = output.split('\n');
    const simulators: Array<{
      name: string;
      udid: string;
      iosVersion: string;
      isRunning: boolean;
    }> = [];
    let currentIOSVersion: string | undefined;

    for (const line of lines) {
      // Match iOS version headers like "-- iOS 18.0 --"
      const versionMatch = line.match(/^--\s+iOS\s+([\d.]+)\s+--/);
      if (versionMatch) {
        currentIOSVersion = versionMatch[1];
        continue;
      }

      // Match simulator lines like "    iPhone 16 Pro Max (ABC12345-...) (Booted)" or "(Shutdown)"
      const simulatorMatch = line.match(/^\s+(.+?)\s+\(([A-F0-9-]+)\)\s+\((.+?)\)/);
      if (simulatorMatch && currentIOSVersion) {
        const name = simulatorMatch[1].trim();
        const udid = simulatorMatch[2].trim();
        const status = simulatorMatch[3].trim();
        const isRunning = status === 'Booted';
        simulators.push({ name, udid, iosVersion: currentIOSVersion, isRunning });
      }
    }

    if (simulators.length === 0) {
      return null;
    }

    // Priority 1: Find running simulator
    const runningSimulator = simulators.find(s => s.isRunning);
    if (runningSimulator) {
      this.logger.debug('Found running simulator', { name: runningSimulator.name });
      return runningSimulator.name;
    }

    // Priority 2: Find newest simulator (highest iOS version, then prefer newer device models)
    // Sort by iOS version (descending), then by device name (descending for newer models)
    const sortedSimulators = simulators.sort((a, b) => {
      const versionA = this.parseVersion(a.iosVersion);
      const versionB = this.parseVersion(b.iosVersion);
      if (versionB !== versionA) {
        return versionB - versionA; // Higher version first
      }
      // If same iOS version, prefer newer device models (higher numbers in name)
      return b.name.localeCompare(a.name);
    });

    const newestSimulator = sortedSimulators[0];
    this.logger.debug('Selected newest simulator', {
      name: newestSimulator.name,
      iosVersion: newestSimulator.iosVersion,
    });
    return newestSimulator.name;
  }

  /**
   * Parses version string (e.g., "18.0" or "17.5") to a comparable number.
   */
  private parseVersion(version: string): number {
    const parts = version.split('.').map(Number);
    // Convert to comparable number: 18.0 -> 1800, 17.5 -> 1750
    return parts[0] * 1000 + (parts[1] || 0) * 10 + (parts[2] || 0);
  }
}
