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
import { readBundleIdFromProject } from './simulatorUtils.js';

/**
 * Delay after install to ensure the app is registered with SpringBoard
 * and ready to launch. Without this, simctl launch can fail with "app not found".
 */
const POST_INSTALL_DELAY_MS = 2000;

/**
 * Launches the iOS app on the target simulator.
 */
export class iOSLaunchAppNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('iosLaunchApp');
    this.logger = logger ?? createComponentLogger('iOSLaunchAppNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping iOS app launch for non-iOS platform');
      return {};
    }

    if (!state.targetDevice) {
      this.logger.warn('No target device specified for app launch');
      return {
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      };
    }

    if (!state.packageName || !state.projectName) {
      this.logger.warn('Package name or project name missing for app launch');
      return {
        workflowFatalErrorMessages: [
          'Package name and project name must be specified for iOS app launch',
        ],
      };
    }

    if (!state.projectPath) {
      this.logger.warn('No project path specified for app launch');
      return {
        workflowFatalErrorMessages: ['Project path must be specified for iOS app launch'],
      };
    }

    const progressReporter = config?.configurable?.progressReporter;
    const deviceName = state.targetDevice;

    // Get bundle ID from project file
    const bundleId = await readBundleIdFromProject(state.projectPath, this.logger);

    this.logger.debug('Launching iOS app on simulator', {
      targetDevice: deviceName,
      bundleId,
    });

    // Brief delay after install to ensure the app is ready to launch
    await new Promise(resolve => setTimeout(resolve, POST_INSTALL_DELAY_MS));

    const result = await this.commandRunner.execute(
      'xcrun',
      ['simctl', 'launch', deviceName, bundleId],
      {
        timeout: 30000,
        progressReporter,
        commandName: 'iOS App Launch',
      }
    );

    if (!result.success) {
      const errorMessage =
        result.stderr || `Failed to launch app: exit code ${result.exitCode ?? 'unknown'}`;
      this.logger.error('Failed to launch iOS app', new Error(errorMessage));
      this.logger.debug('Launch command details', {
        exitCode: result.exitCode ?? null,
        signal: result.signal ?? null,
        stderr: result.stderr,
        stdout: result.stdout,
      });
      return {
        workflowFatalErrorMessages: [
          `Failed to launch iOS app on simulator "${deviceName}": ${errorMessage}`,
        ],
      };
    }

    this.logger.info('iOS app launched successfully', {
      targetDevice: deviceName,
      bundleId,
    });
    return {
      deploymentStatus: 'success',
    };
  };
}
