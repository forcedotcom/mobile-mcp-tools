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
import { TempDirectoryManager } from '../../../common.js';
import { installIOSApp } from './simulatorUtils.js';

/**
 * Installs the iOS app to the target simulator.
 */
export class iOSInstallAppNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;
  private readonly tempDirManager: TempDirectoryManager;

  constructor(commandRunner: CommandRunner, tempDirManager: TempDirectoryManager, logger?: Logger) {
    super('iosInstallApp');
    this.logger = logger ?? createComponentLogger('iOSInstallAppNode');
    this.commandRunner = commandRunner;
    this.tempDirManager = tempDirManager;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping iOS app install for non-iOS platform');
      return {};
    }

    if (!state.targetDevice) {
      this.logger.warn('No target device specified for app installation');
      return {
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      };
    }

    if (!state.projectName) {
      this.logger.warn('No project name specified for app installation');
      return {
        workflowFatalErrorMessages: ['Project name must be specified for iOS deployment'],
      };
    }

    try {
      const appArtifactPath = this.tempDirManager.getAppArtifactPath(state.projectName, 'iOS');
      const progressReporter = config?.configurable?.progressReporter;

      const result = await installIOSApp(this.commandRunner, this.logger, {
        deviceName: state.targetDevice,
        appArtifactPath,
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
        'Error installing iOS app',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to install iOS app: ${errorMessage}`],
      };
    }
  };
}
