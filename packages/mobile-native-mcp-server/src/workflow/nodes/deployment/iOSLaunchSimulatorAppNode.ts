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
 * Launches the macOS Simulator app if it's not already running.
 */
export class iOSLaunchSimulatorAppNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('iosLaunchSimulatorApp');
    this.logger = logger ?? createComponentLogger('iOSLaunchSimulatorAppNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping iOS simulator app launch for non-iOS platform');
      return {};
    }

    try {
      this.logger.debug('Launching macOS Simulator app');

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute('open', ['-a', 'Simulator'], {
        timeout: 30000,
        progressReporter,
        commandName: 'Launch Simulator App',
      });

      if (!result.success) {
        const errorMessage =
          result.stderr ||
          `Failed to launch Simulator app: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to launch Simulator app', new Error(errorMessage));
        return {
          workflowFatalErrorMessages: [`Failed to launch macOS Simulator app: ${errorMessage}`],
        };
      }

      this.logger.info('macOS Simulator app launched successfully');
      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error launching Simulator app',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to launch macOS Simulator app: ${errorMessage}`],
      };
    }
  };
}
