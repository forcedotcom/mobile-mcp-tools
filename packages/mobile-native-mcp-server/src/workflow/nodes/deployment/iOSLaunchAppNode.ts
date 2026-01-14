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
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

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

    try {
      // Get bundle ID from project file (required)
      const bundleId = this.readBundleIdFromProject(state.projectPath, state.projectName);

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
   * Reads bundle ID from the Xcode project file.
   * Reads PRODUCT_BUNDLE_IDENTIFIER from project.pbxproj file.
   * @throws Error if bundle ID cannot be found or read from the project file
   */
  private readBundleIdFromProject(projectPath: string, _projectName: string): string {
    // Find the .xcodeproj directory
    let xcodeprojPath: string | null = null;
    try {
      const files = readdirSync(projectPath);
      for (const file of files) {
        if (file.endsWith('.xcodeproj')) {
          xcodeprojPath = join(projectPath, file, 'project.pbxproj');
          break;
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to read project directory at ${projectPath}: ${error instanceof Error ? error.message : `${error}`}`
      );
    }

    if (!xcodeprojPath) {
      throw new Error(`No .xcodeproj directory found in project path: ${projectPath}`);
    }

    let content: string;
    try {
      content = readFileSync(xcodeprojPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read project.pbxproj file at ${xcodeprojPath}: ${error instanceof Error ? error.message : `${error}`}`
      );
    }

    // Match PRODUCT_BUNDLE_IDENTIFIER patterns:
    // PRODUCT_BUNDLE_IDENTIFIER = "com.example.app";
    // PRODUCT_BUNDLE_IDENTIFIER = com.example.app;
    // PRODUCT_BUNDLE_IDENTIFIER = "com.example.${PRODUCT_NAME:rfc1034identifier}";
    const match = content.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*["']?([^"'\s;]+)["']?;/);
    if (!match || !match[1]) {
      throw new Error(`Could not find PRODUCT_BUNDLE_IDENTIFIER in project file: ${xcodeprojPath}`);
    }

    const bundleId = match[1];
    // Check if it contains unresolved variables (we can't resolve them here)
    if (bundleId.includes('${') || bundleId.includes('$(')) {
      throw new Error(
        `Bundle ID contains unresolved variables in project file ${xcodeprojPath}: ${bundleId}. The bundle identifier must be fully resolved.`
      );
    }

    this.logger.debug('Found bundle ID in project file', {
      file: xcodeprojPath,
      bundleId,
    });
    return bundleId;
  }
}
