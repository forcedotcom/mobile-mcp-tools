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
import { State } from '../../../metadata.js';
import { readBundleIdFromProject, launchIOSApp } from './simulatorUtils.js';

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

    const result = await launchIOSApp(this.commandRunner, this.logger, {
      deviceName,
      bundleId,
      progressReporter,
      postInstallDelayMs: 2000, // Delay after install to ensure app is ready to launch
    });

    if (!result.success) {
      return {
        workflowFatalErrorMessages: [result.error],
      };
    }

    return {
      deploymentStatus: 'success',
    };
  };
}
