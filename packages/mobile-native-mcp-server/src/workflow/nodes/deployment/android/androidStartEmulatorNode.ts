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

    // Wait for emulator to be fully ready
    this.logger.debug('Waiting for emulator to be fully ready');
    const readyResult = await waitForEmulatorReady(this.commandRunner, this.logger, {
      progressReporter,
      maxWaitTime: 120000,
      pollInterval: 3000,
    });

    if (!readyResult.success) {
      this.logger.error(
        'Emulator did not become ready',
        new Error(readyResult.error ?? 'Unknown error')
      );
      return {
        workflowFatalErrorMessages: [readyResult.error ?? 'Emulator did not become ready'],
      };
    }

    this.logger.info('Android emulator started successfully and ready', { emulatorName });
    return {};
  };
}
