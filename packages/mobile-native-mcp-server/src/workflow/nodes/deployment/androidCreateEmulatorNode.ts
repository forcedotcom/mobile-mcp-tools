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
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Creates an Android emulator if one doesn't exist.
 * Reads minSdk from build.gradle or build.gradle.kts if available.
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

    if (!state.projectPath) {
      this.logger.warn('No project path specified for emulator creation');
      return {
        workflowFatalErrorMessages: ['Project path must be specified for Android deployment'],
      };
    }

    try {
      // Try to read minSdk from build.gradle or build.gradle.kts
      let minSdk: string = state.androidMinSdk ?? '';
      if (!minSdk && state.projectPath) {
        const readMinSdk = this.readMinSdkFromGradle(state.projectPath);
        if (readMinSdk) {
          minSdk = readMinSdk;
        }
      }

      if (!minSdk) {
        this.logger.warn('Could not determine minSdk, using default value 28');
        minSdk = '28';
      }

      const emulatorName = `pixel-${minSdk}`;
      this.logger.debug('Creating Android emulator', {
        emulatorName,
        minSdk,
      });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'sf',
        [
          'force',
          'lightning',
          'local',
          'device',
          'create',
          '-p',
          'android',
          '-n',
          emulatorName,
          '-d',
          'pixel',
          '-l',
          minSdk,
        ],
        {
          timeout: 120000,
          cwd: state.projectPath,
          progressReporter,
        }
      );

      if (!result.success) {
        // Check if emulator already exists (this is not necessarily an error)
        if (result.stderr?.includes('already exists') || result.stderr?.includes('duplicate')) {
          this.logger.info('Emulator already exists, continuing', { emulatorName });
          return {};
        }

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

  /**
   * Attempts to read minSdk from build.gradle or build.gradle.kts file.
   */
  private readMinSdkFromGradle(projectPath: string): string | undefined {
    try {
      const gradleFiles = [
        join(projectPath, 'app', 'build.gradle'),
        join(projectPath, 'app', 'build.gradle.kts'),
      ];

      for (const gradleFile of gradleFiles) {
        try {
          const content = readFileSync(gradleFile, 'utf-8');
          // Try to match minSdk patterns: minSdk = 28 or minSdk 28
          const match = content.match(/minSdk\s*[=:]\s*(\d+)/);
          if (match && match[1]) {
            this.logger.debug('Found minSdk in build.gradle', {
              file: gradleFile,
              minSdk: match[1],
            });
            return match[1];
          }
        } catch {
          // File doesn't exist or can't be read, try next file
          continue;
        }
      }
    } catch (error) {
      this.logger.debug('Error reading minSdk from gradle files', { error });
    }

    return undefined;
  }
}
