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
import { fetchSimulatorDevices, selectBestSimulator } from './simulatorUtils.js';

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

      // Fetch available simulators using shared utility
      const result = await fetchSimulatorDevices(this.commandRunner, this.logger, {
        progressReporter,
      });

      if (!result.success) {
        this.logger.error('Failed to list iOS simulators', new Error(result.error));
        return {
          workflowFatalErrorMessages: [
            `Failed to list iOS simulators: ${result.error}. Please ensure Xcode is properly installed.`,
          ],
        };
      }

      // Select best simulator using shared utility
      const selectedDevice = selectBestSimulator(result.devices, this.logger);

      if (!selectedDevice) {
        this.logger.warn('No simulators found');
        return {
          workflowFatalErrorMessages: [
            'No iOS simulators found. Please install simulators via Xcode.',
          ],
        };
      }

      this.logger.info('Selected iOS simulator', { targetDevice: selectedDevice.name });
      return { targetDevice: selectedDevice.name };
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
}
