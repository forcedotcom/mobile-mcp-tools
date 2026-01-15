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
  ProgressReporter,
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
        workflowFatalErrorMessages: ['Emulator name must be specified for Android deployment'],
      };
    }

    const emulatorName = state.androidEmulatorName;

    const progressReporter = config?.configurable?.progressReporter;

    try {
      // Check if emulator is already running and responsive
      const isResponsive = await this.verifyEmulatorResponsive(progressReporter);
      if (isResponsive) {
        this.logger.info('Emulator is already running and responsive', { emulatorName });
        return {};
      }

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

      if (!result.success) {
        // Check if it's already running - this is SUCCESS, not failure
        const isAlreadyRunning =
          result.stderr?.includes('already running') ||
          result.stdout?.includes('already running') ||
          result.stderr?.includes('already booted');

        if (isAlreadyRunning) {
          this.logger.info('Emulator already running, verifying responsiveness', { emulatorName });

          // Wait for emulator to be fully ready
          await this.waitForEmulatorReadyWithRetry(progressReporter);
          return {};
        }

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

      this.logger.info('Android emulator start command completed', { emulatorName });

      // Wait for emulator to be fully ready (start command returns but emulator may not be ready)
      this.logger.debug('Waiting for emulator to be fully ready');
      await this.waitForEmulatorReadyWithRetry(progressReporter);

      this.logger.info('Android emulator started successfully and ready', { emulatorName });
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

  /**
   * Waits for the emulator to be fully ready with error handling.
   */
  private async waitForEmulatorReadyWithRetry(progressReporter?: ProgressReporter): Promise<void> {
    const result = await waitForEmulatorReady(this.commandRunner, this.logger, {
      progressReporter,
      maxWaitTime: 120000,
      pollInterval: 3000,
    });

    if (!result.success) {
      throw new Error(result.error || 'Emulator did not become ready');
    }
  }

  /**
   * Verifies the emulator is actually responsive by running a simple command.
   * This catches cases where the emulator is "running" but not yet accepting commands.
   */
  private async verifyEmulatorResponsive(progressReporter?: ProgressReporter): Promise<boolean> {
    try {
      const result = await this.commandRunner.execute(
        'adb',
        ['shell', 'getprop', 'sys.boot_completed'],
        { timeout: 10000, progressReporter, commandName: 'Verify Android Emulator Responsiveness' }
      );
      return result.success && result.stdout.trim() === '1';
    } catch {
      return false;
    }
  }
}
