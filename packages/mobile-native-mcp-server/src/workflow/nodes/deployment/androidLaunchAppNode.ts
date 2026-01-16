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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    let applicationId: string | undefined = this.readApplicationIdFromGradle(state.projectPath);
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

    // Get the emulator name for Android
    const targetDevice = state.androidEmulatorName;
    if (!targetDevice) {
      this.logger.warn('No emulator name specified for app launch');
      return {
        workflowFatalErrorMessages: [
          'Emulator name must be specified for Android app launch. Please ensure an emulator is selected.',
        ],
      };
    }

    // Get the launcher activity from AndroidManifest.xml
    const activityClass = this.readLaunchActivityFromManifest(state.projectPath);
    if (!activityClass) {
      this.logger.warn('Could not determine launcher activity from AndroidManifest.xml');
      return {
        workflowFatalErrorMessages: [
          'Launcher activity must be specified in AndroidManifest.xml with android.intent.category.LAUNCHER.',
        ],
      };
    }

    // Construct the launch intent in format: packageId/activityClass
    const launchIntent = `${applicationId}/${activityClass}`;

    try {
      this.logger.debug('Launching Android app', { applicationId, targetDevice, launchIntent });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'sf',
        [
          'force',
          'lightning',
          'local',
          'app',
          'launch',
          '-p',
          'android',
          '-t',
          targetDevice,
          '-i',
          launchIntent,
        ],
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

      this.logger.info('Android app launched successfully', { applicationId, targetDevice });
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
  private readApplicationIdFromGradle(projectPath: string): string | undefined {
    try {
      const gradleFiles = [
        join(projectPath, 'app', 'build.gradle'),
        join(projectPath, 'app', 'build.gradle.kts'),
      ];

      for (const gradleFile of gradleFiles) {
        try {
          const content = readFileSync(gradleFile, 'utf-8');
          // Try to match applicationId patterns: applicationId = "com.example.app" or applicationId "com.example.app"
          const applicationIdPattern = /applicationId\s*[=:]\s*["']([^"']+)["']/;
          const match = applicationIdPattern.exec(content);
          if (match?.[1]) {
            this.logger.debug('Found applicationId in build.gradle', {
              file: gradleFile,
              applicationId: match[1],
            });
            return match[1];
          }
        } catch {
          // File doesn't exist or can't be read, try next file
          continue;
        }
      }
    } catch (error) {
      this.logger.debug('Error reading applicationId from gradle files', { error });
    }

    return undefined;
  }

  /**
   * Reads the AndroidManifest.xml file and extracts the launcher activity class name.
   * Looks for an activity with android.intent.category.LAUNCHER intent-filter.
   */
  private readLaunchActivityFromManifest(projectPath: string): string | undefined {
    try {
      const manifestPath = join(projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');
      const content = readFileSync(manifestPath, 'utf-8');

      // Find activity blocks that contain the LAUNCHER category
      // Pattern matches: <activity android:name=".MainActivity" ...> ... <category android:name="android.intent.category.LAUNCHER" /> ... </activity>
      const activityPattern =
        /<activity[^>]*android:name\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<category\s+android:name\s*=\s*["']android\.intent\.category\.LAUNCHER["']\s*\/>[\s\S]*?<\/activity>/g;

      const match = activityPattern.exec(content);
      if (match?.[1]) {
        this.logger.debug('Found launcher activity in AndroidManifest.xml', {
          activityName: match[1],
        });
        return match[1];
      }

      // Alternative pattern: activity name might come after other attributes
      const altPattern =
        /<activity[^>]*>[\s\S]*?<category\s+android:name\s*=\s*["']android\.intent\.category\.LAUNCHER["']\s*\/>[\s\S]*?<\/activity>/g;
      let activityBlock: RegExpExecArray | null;
      while ((activityBlock = altPattern.exec(content)) !== null) {
        const namePattern = /android:name\s*=\s*["']([^"']+)["']/;
        const nameMatch = namePattern.exec(activityBlock[0]);
        if (nameMatch?.[1]) {
          this.logger.debug('Found launcher activity in AndroidManifest.xml (alt pattern)', {
            activityName: nameMatch[1],
          });
          return nameMatch[1];
        }
      }

      this.logger.debug('No launcher activity found in AndroidManifest.xml');
    } catch (error) {
      this.logger.debug('Error reading AndroidManifest.xml', { error });
    }

    return undefined;
  }
}
