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
import { State } from '../../metadata.js';
import { installAndroidApp } from './androidEmulatorUtils.js';
import { getApkPath } from './androidUtils.js';

/**
 * Installs the Android app using Salesforce CLI (sf force lightning local app install).
 */
export class AndroidInstallAppNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('androidInstallApp');
    this.logger = logger ?? createComponentLogger('AndroidInstallAppNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'Android') {
      this.logger.debug('Skipping Android app install for non-Android platform');
      return {};
    }

    if (!state.projectPath) {
      this.logger.warn('No project path specified for app installation');
      return {
        workflowFatalErrorMessages: ['Project path must be specified for Android deployment'],
      };
    }

    const targetDevice = state.androidEmulatorName;
    if (!targetDevice) {
      this.logger.warn('No emulator name specified for app installation');
      return {
        workflowFatalErrorMessages: [
          'Emulator name must be specified for Android deployment. Ensure AndroidSelectEmulatorNode ran successfully.',
        ],
      };
    }

    try {
      const buildType = state.buildType ?? 'debug';
      const apkPath = getApkPath(state.projectPath, buildType);

      const progressReporter = config?.configurable?.progressReporter;

      const result = await installAndroidApp(this.commandRunner, this.logger, {
        apkPath,
        targetDevice,
        projectPath: state.projectPath,
        progressReporter,
      });

      if (!result.success) {
        return {
          workflowFatalErrorMessages: [result.error],
        };
      }

      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error installing Android app',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to install Android app: ${errorMessage}`],
      };
    }
  };
}
