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
 * Checks if the target iOS simulator is running.
 * Sets simulatorRunning state based on the check result.
 */
export class iOSCheckSimulatorStatusNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('iosCheckSimulatorStatus');
    this.logger = logger ?? createComponentLogger('iOSCheckSimulatorStatusNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping iOS simulator status check for non-iOS platform');
      return {};
    }

    if (!state.targetDevice) {
      this.logger.warn('No target device specified for simulator status check');
      return {
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      };
    }

    try {
      this.logger.debug('Checking simulator status', { targetDevice: state.targetDevice });

      const progressReporter = config?.configurable?.progressReporter;

      // List all devices and grep for the target device
      const result = await this.commandRunner.execute(
        'sh',
        ['-c', `xcrun simctl list devices | grep "${state.targetDevice}"`],
        {
          timeout: 30000,
          progressReporter,
        }
      );

      if (!result.success) {
        // Device not found - treat as not running
        this.logger.debug('Simulator device not found or not running', {
          targetDevice: state.targetDevice,
          exitCode: result.exitCode,
        });
        return { simulatorRunning: false };
      }

      // Check if output contains "(Shutdown)" which means the simulator is not running
      const isRunning = !result.stdout.includes('(Shutdown)');
      this.logger.debug('Simulator status check completed', {
        targetDevice: state.targetDevice,
        isRunning,
      });

      return { simulatorRunning: isRunning };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error checking simulator status',
        error instanceof Error ? error : new Error(errorMessage)
      );
      // Treat error as not running - boot node will attempt to start it
      return { simulatorRunning: false };
    }
  };
}
