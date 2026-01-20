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
import {
  readApplicationIdFromGradle,
  readLaunchActivityFromManifest,
} from './androidEmulatorUtils.js';

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

    // Get applicationId from build.gradle, fall back to packageName from state
    let applicationId = readApplicationIdFromGradle(state.projectPath, this.logger);
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
    const activityClass = readLaunchActivityFromManifest(state.projectPath, this.logger);
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
  };
}
