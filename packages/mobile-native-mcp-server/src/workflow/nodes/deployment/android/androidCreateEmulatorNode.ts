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
import { createAndroidEmulator } from './androidEmulatorUtils.js';

/**
 * Creates an Android emulator when none exists.
 * Uses the SF CLI to create a Pixel emulator with the configured API level.
 *
 * This node is invoked when AndroidSelectEmulatorNode finds no emulators.
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

    const result = await createAndroidEmulator(this.commandRunner, this.logger, {
      emulatorName,
      apiLevel,
      projectPath: state.projectPath,
      progressReporter,
    });

    if (!result.success) {
      return {
        workflowFatalErrorMessages: [result.error],
      };
    }

    return { androidEmulatorName: result.emulatorName };
  };
}
