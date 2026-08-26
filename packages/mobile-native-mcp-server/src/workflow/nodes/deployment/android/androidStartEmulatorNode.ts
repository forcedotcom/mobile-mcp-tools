/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  BaseNode,
  createComponentLogger,
  type Logger,
  type CommandRunner,
  type WorkflowRunnableConfig,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../../../metadata.js';
import { waitForEmulatorReady, startAndroidEmulator } from './androidEmulatorUtils.js';

/**
 * Starts the Android emulator if it's not already running.
 * This node is idempotent - it handles "already running" as success.
 *
 * This node is analogous to iOSBootSimulatorNode for the Android flow.
 */
export class AndroidStartEmulatorNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('androidStartEmulator');
    this.logger = logger ?? createComponentLogger('AndroidStartEmulatorNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'Android') {
      this.logger.debug('Skipping Android emulator start for non-Android platform');
      return {};
    }

    if (!state.androidEmulatorName) {
      this.logger.warn('No emulator name specified for emulator start');
      return {
        workflowFatalErrorMessages: [
          'Emulator name must be selected before starting. Ensure AndroidSelectEmulatorNode ran successfully.',
        ],
      };
    }

    try {
      const emulatorName = state.androidEmulatorName;
      const progressReporter = config?.configurable?.progressReporter;

      const result = await startAndroidEmulator(this.commandRunner, this.logger, {
        emulatorName,
        projectPath: state.projectPath,
        progressReporter,
      });

      if (!result.success) {
        return {
          workflowFatalErrorMessages: [result.error],
        };
      }

      if (result.wasAlreadyRunning) {
        this.logger.debug('Emulator was already running', { emulatorName });
      }

      // Wait for emulator to be fully ready
      const readyResult = await waitForEmulatorReady(this.commandRunner, this.logger, {
        progressReporter,
        maxWaitTime: 120000,
        pollInterval: 3000,
      });

      if (!readyResult.success) {
        return {
          workflowFatalErrorMessages: [readyResult.error ?? 'Emulator did not become ready'],
        };
      }

      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error starting Android emulator',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to start Android emulator: ${errorMessage}`],
      };
    }
  };
}
