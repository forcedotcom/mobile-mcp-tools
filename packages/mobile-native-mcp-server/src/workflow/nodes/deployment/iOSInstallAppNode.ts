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
      this.logger.debug('Installing iOS app to simulator', {
        targetDevice: state.targetDevice,
        appArtifactPath,
      });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'install', state.targetDevice, appArtifactPath],
        {
          timeout: 120000,
          progressReporter,
          commandName: 'iOS App Installation',
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to install app: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to install iOS app', new Error(errorMessage));
        this.logger.debug('Install command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [
            `Failed to install iOS app to simulator "${state.targetDevice}": ${errorMessage}`,
          ],
        };
      }

      this.logger.info('iOS app installed successfully', {
        targetDevice: state.targetDevice,
        appArtifactPath,
      });
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
