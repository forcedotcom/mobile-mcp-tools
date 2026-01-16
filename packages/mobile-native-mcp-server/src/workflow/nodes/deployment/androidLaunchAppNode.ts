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
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Launches the Android app on the emulator.
 */
export class AndroidLaunchAppNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('androidLaunchApp');
    this.logger = logger ?? createComponentLogger('AndroidLaunchAppNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'Android') {
      this.logger.debug('Skipping Android app launch for non-Android platform');
      return {};
    }

    if (!state.projectPath) {
      this.logger.warn('No project path specified for app launch');
      return {
        workflowFatalErrorMessages: ['Project path must be specified for Android deployment'],
      };
    }

    // Try to get applicationId from build.gradle, fall back to packageName from state
    let applicationId: string | undefined = await this.readApplicationIdFromGradle(state.projectPath);
    if (!applicationId && state.packageName) {
      this.logger.debug('Using packageName as applicationId fallback', {
        packageName: state.packageName,
      });
      applicationId = state.packageName;
    }

    if (!applicationId) {
      this.logger.warn('Could not determine applicationId for app launch');
      return {
        workflowFatalErrorMessages: [
          'Application ID must be specified for Android app launch. Please ensure build.gradle contains applicationId.',
        ],
      };
    }

    try {
      this.logger.debug('Launching Android app', { applicationId });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'adb',
        ['shell', 'monkey', '-p', applicationId, '-c', 'android.intent.category.LAUNCHER', '1'],
        {
          timeout: 30000,
          progressReporter,
          commandName: 'Android App Launch',
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to launch app: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to launch Android app', new Error(errorMessage));
        this.logger.debug('Launch command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [
            `Failed to launch Android app "${applicationId}": ${errorMessage}`,
          ],
        };
      }

      this.logger.info('Android app launched successfully', { applicationId });
      return {
        deploymentStatus: 'success',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error launching Android app',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to launch Android app: ${errorMessage}`],
      };
    }
  };

  /**
   * Attempts to read applicationId from build.gradle or build.gradle.kts file.
   */
  private async readApplicationIdFromGradle(projectPath: string): Promise<string | undefined> {
    const gradleFiles = [
      join(projectPath, 'app', 'build.gradle'),
      join(projectPath, 'app', 'build.gradle.kts'),
    ];

    for (const gradleFile of gradleFiles) {
      try {
        const content = await readFile(gradleFile, 'utf-8');
        // Try to match applicationId patterns: applicationId = "com.example.app" or applicationId "com.example.app"
        const match = content.match(/applicationId\s*[=:]\s*["']([^"']+)["']/);
        if (match && match[1]) {
          this.logger.debug('Found applicationId in build.gradle', {
            file: gradleFile,
            applicationId: match[1],
          });
          return match[1];
        }
      } catch (error) {
        // File doesn't exist or can't be read, try next file
        this.logger.debug('Could not read gradle file, trying next', {
          file: gradleFile,
          error: error instanceof Error ? error.message : `${error}`,
        });
        continue;
      }
    }

    return undefined;
  }
}
