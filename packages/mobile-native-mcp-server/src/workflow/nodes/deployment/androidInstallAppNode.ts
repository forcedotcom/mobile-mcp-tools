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

    try {
      this.logger.debug('Installing Android app using sf CLI', {
        projectPath: state.projectPath,
        buildType,
        targetDevice,
        apkPath,
      });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'sf',
        [
          'force',
          'lightning',
          'local',
          'app',
          'install',
          '-p',
          'android',
          '-t',
          targetDevice,
          '-a',
          apkPath,
        ],
        {
          timeout: 300000,
          cwd: state.projectPath,
          progressReporter,
          commandName: 'Android App Installation',
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to install app: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to install Android app', new Error(errorMessage));
        this.logger.debug('Install command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [`Failed to install Android app: ${errorMessage}`],
        };
      }

      this.logger.info('Android app installed successfully', {
        buildType,
        targetDevice,
        apkPath,
      });
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
