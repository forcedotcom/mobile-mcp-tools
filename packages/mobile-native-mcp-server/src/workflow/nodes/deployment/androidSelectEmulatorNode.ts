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
import { fetchAndroidEmulators, selectBestEmulator } from './androidEmulatorUtils.js';

/**
 * Determines and selects the target Android emulator device.
 * Selection priority:
 * 1. Use androidEmulatorName if already set in state
 * 2. Use running emulator if available
 * 3. Use emulator with highest API level as fallback
 *
 * This node is analogous to iOSSelectSimulatorNode for the Android flow.
 * If no emulator is found, it's a fatal error (user must create one via Android Studio).
 */
export class AndroidSelectEmulatorNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('androidSelectEmulator');
    this.logger = logger ?? createComponentLogger('AndroidSelectEmulatorNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'Android') {
      this.logger.debug('Skipping Android emulator selection for non-Android platform');
      return {};
    }

    // If emulator name is already set, use it
    if (state.androidEmulatorName) {
      this.logger.debug('Android emulator already set', {
        androidEmulatorName: state.androidEmulatorName,
      });
      return {};
    }

    try {
      this.logger.debug('Selecting Android emulator device');

      const progressReporter = config?.configurable?.progressReporter;

      // Fetch available emulators
      const result = await fetchAndroidEmulators(this.commandRunner, this.logger, {
        progressReporter,
      });

      if (!result.success) {
        this.logger.error('Failed to list Android emulators', new Error(result.error));
        return {
          workflowFatalErrorMessages: [
            `Failed to list Android emulators: ${result.error}. Please ensure Android SDK is properly installed.`,
          ],
        };
      }

      // Select best emulator using shared utility
      const selectedEmulator = selectBestEmulator(result.emulators, this.logger);

      if (!selectedEmulator) {
        this.logger.warn('No emulators found');
        return {
          workflowFatalErrorMessages: [
            'No Android emulators found. Please create an emulator via Android Studio > Device Manager.',
          ],
        };
      }

      this.logger.info('Selected Android emulator', {
        androidEmulatorName: selectedEmulator.name,
      });
      return { androidEmulatorName: selectedEmulator.name };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error selecting Android emulator',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [
          `Failed to select Android emulator: ${errorMessage}. Please ensure Android SDK is properly installed.`,
        ],
      };
    }
  };
}
