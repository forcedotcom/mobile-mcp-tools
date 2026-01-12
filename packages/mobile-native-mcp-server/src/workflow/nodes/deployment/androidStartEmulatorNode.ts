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
 * Starts the Android emulator.
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

    if (!state.projectPath) {
      this.logger.warn('No project path specified for emulator start');
      return {
        workflowFatalErrorMessages: ['Project path must be specified for Android deployment'],
      };
    }

    // Determine emulator name - use state value or derive from minSdk
    let emulatorName = state.androidEmulatorName;
    if (!emulatorName && state.androidMinSdk) {
      emulatorName = `pixel-${state.androidMinSdk}`;
    }
    if (!emulatorName) {
      // Default fallback
      emulatorName = 'pixel-28';
    }

    try {
      this.logger.debug('Starting Android emulator', { emulatorName });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'sf',
        ['force', 'lightning', 'local', 'device', 'start', '-p', 'android', '-t', emulatorName],
        {
          timeout: 120000,
          cwd: state.projectPath,
          progressReporter,
        }
      );

      if (!result.success) {
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

      this.logger.info('Android emulator started successfully', { emulatorName });
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
