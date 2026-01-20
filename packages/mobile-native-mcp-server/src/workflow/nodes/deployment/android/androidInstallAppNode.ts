/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import path from 'node:path';
import {
  BaseNode,
  createComponentLogger,
  Logger,
  CommandRunner,
  WorkflowRunnableConfig,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../../metadata.js';
import { installAndroidApp } from './androidEmulatorUtils.js';

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

    const targetDevice = state.targetDevice ?? state.androidEmulatorName;
    if (!targetDevice) {
      this.logger.warn('No target device specified for app installation');
      return {
        workflowFatalErrorMessages: [
          'Target device or emulator must be specified for Android deployment',
        ],
      };
    }

    const buildType = state.buildType ?? 'debug';
    // Construct the APK path based on standard Gradle output location
    const apkPath = path.join(
      state.projectPath,
      'app',
      'build',
      'outputs',
      'apk',
      buildType,
      `app-${buildType}.apk`
    );

    this.logger.debug('Installing Android app using sf CLI', {
      projectPath: state.projectPath,
      buildType,
      targetDevice,
      apkPath,
    });

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
  };
}
