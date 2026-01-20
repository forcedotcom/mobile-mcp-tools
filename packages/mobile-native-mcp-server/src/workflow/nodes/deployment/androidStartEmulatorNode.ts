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
import { waitForEmulatorReady } from './androidEmulatorUtils.js';

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

    this.logger.debug('Starting Android emulator', { emulatorName });

    const result = await this.commandRunner.execute(
      'sf',
      ['force', 'lightning', 'local', 'device', 'start', '-p', 'android', '-t', emulatorName],
      {
        timeout: 120000,
        cwd: state.projectPath,
        progressReporter,
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
      this.logger.error('Failed to start Android emulator', new Error(errorMessage));
      this.logger.debug('Start emulator command details', {
        exitCode: result.exitCode ?? null,
        signal: result.signal ?? null,
        stderr: result.stderr,
        stdout: result.stdout,
      });
      return {
        workflowFatalErrorMessages: [
          `Failed to start Android emulator "${emulatorName}": ${errorMessage}`,
        ],
      };
    }

    if (isAlreadyRunning) {
      this.logger.info('Emulator already running, verifying responsiveness', { emulatorName });
    } else {
      this.logger.info('Android emulator start command completed', { emulatorName });
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
