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

    try {
      // Try to get the actual bundle ID from the installed app first
      let bundleId = await this.getInstalledBundleId(state.targetDevice, state.projectName);

      // Fallback to constructed bundle ID if we can't find it
      if (!bundleId) {
        bundleId = `${state.packageName}.${state.projectName}`;
        this.logger.debug(
          'Could not detect bundle ID from installed app, using constructed bundle ID',
          {
            bundleId,
          }
        );
      } else {
        this.logger.debug('Detected bundle ID from installed app', { bundleId });
      }

      this.logger.debug('Launching iOS app on simulator', {
        targetDevice: state.targetDevice,
        bundleId,
      });

      const progressReporter = config?.configurable?.progressReporter;

      // Wait a moment after install to ensure app is ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'launch', state.targetDevice, bundleId],
        {
          timeout: 30000, // Launch command should return immediately
          progressReporter,
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
            `Failed to launch iOS app on simulator "${state.targetDevice}": ${errorMessage}`,
          ],
        };
      }

      this.logger.info('iOS app launched successfully', {
        targetDevice: state.targetDevice,
        bundleId,
      });
      return {
        deploymentStatus: 'success',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error launching iOS app',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to launch iOS app: ${errorMessage}`],
      };
    }
  };

  /**
   * Attempts to get the actual bundle ID from the installed app on the simulator.
   * Uses `xcrun simctl listapps` to find the bundle ID matching the project name.
   */
  private async getInstalledBundleId(
    deviceName: string,
    projectName: string
  ): Promise<string | null> {
    try {
      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'listapps', deviceName, '--json'],
        {
          timeout: 10000,
        }
      );

      if (!result.success) {
        this.logger.debug('Failed to list apps, will use constructed bundle ID', {
          stderr: result.stderr,
        });
        return null;
      }

      try {
        const apps = JSON.parse(result.stdout) as Record<
          string,
          { CFBundleName?: string; CFBundleDisplayName?: string }
        >;
        // Look for app matching project name (case-insensitive)
        const projectNameLower = projectName.toLowerCase();
        for (const [bundleId, appInfo] of Object.entries(apps)) {
          const appName = (appInfo.CFBundleName || appInfo.CFBundleDisplayName || '').toLowerCase();
          if (appName.includes(projectNameLower)) {
            this.logger.debug('Found matching app in installed apps', {
              bundleId,
              appName: appInfo.CFBundleName || appInfo.CFBundleDisplayName,
            });
            return bundleId;
          }
        }
      } catch (parseError) {
        this.logger.debug('Failed to parse apps list JSON', { error: parseError });
        return null;
      }

      return null;
    } catch (error) {
      this.logger.debug('Error getting installed bundle ID', {
        error: error instanceof Error ? error.message : `${error}`,
      });
      return null;
    }
  }
}
