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
 * Installs the Android app using Gradle.
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

    const buildType = state.buildType ?? 'debug';
    const gradleTask = `install${buildType === 'release' ? 'Release' : 'Debug'}`;

    try {
      this.logger.debug('Installing Android app', {
        projectPath: state.projectPath,
        buildType,
        gradleTask,
      });

      const progressReporter = config?.configurable?.progressReporter;

      // Determine gradle wrapper command (gradlew or gradlew.bat)
      const isWindows = process.platform === 'win32';
      const gradleCommand = isWindows ? 'gradlew.bat' : './gradlew';

      const result = await this.commandRunner.execute(
        isWindows ? 'cmd' : 'sh',
        isWindows
          ? ['/c', `${gradleCommand} ${gradleTask}`]
          : ['-c', `${gradleCommand} ${gradleTask}`],
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
        gradleTask,
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
