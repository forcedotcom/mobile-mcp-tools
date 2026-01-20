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
import { PLATFORM_API_LEVELS } from '../checkPlatformSetup.js';

/**
 * Creates an Android emulator when none exists.
 * Uses the SF CLI to create a Pixel emulator with the configured API level.
 *
 * This node is invoked when AndroidListDevicesNode finds no emulators.
 * On success, sets androidEmulatorName in state.
 * On failure, sets workflowFatalErrorMessages.
 */
export class AndroidCreateEmulatorNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('androidCreateEmulator');
    this.logger = logger ?? createComponentLogger('AndroidCreateEmulatorNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'Android') {
      this.logger.debug('Skipping Android emulator creation for non-Android platform');
      return {};
    }

    // Generate a unique emulator name based on project name
    const projectName = state.projectName ?? 'App';
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const apiLevel = PLATFORM_API_LEVELS.Android;
    const emulatorName = `Pixel_API_${apiLevel}_${sanitizedProjectName}`;

    const progressReporter = config?.configurable?.progressReporter;

    try {
      this.logger.info('Creating Android emulator', { emulatorName, apiLevel });

      // Execute: sf force lightning local device create -n <name> -d pixel -p android -l <apiLevel>
      const result = await this.commandRunner.execute(
        'sf',
        [
          'force',
          'lightning',
          'local',
          'device',
          'create',
          '-n',
          emulatorName,
          '-d',
          'pixel',
          '-p',
          'android',
          '-l',
          apiLevel,
        ],
        {
          timeout: 300000, // 5 minutes for emulator creation
          cwd: state.projectPath,
          progressReporter,
          commandName: 'Create Android Emulator',
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to create emulator: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to create Android emulator', new Error(errorMessage));
        this.logger.debug('Create emulator command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [
            `Failed to create Android emulator "${emulatorName}": ${errorMessage}`,
          ],
        };
      }

      this.logger.info('Android emulator created successfully', { emulatorName });
      return { androidEmulatorName: emulatorName };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error creating Android emulator',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to create Android emulator: ${errorMessage}`],
      };
    }
  };
}
