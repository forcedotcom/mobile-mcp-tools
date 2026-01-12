/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  Logger,
  createComponentLogger,
  CommandRunner,
  ProgressReporter,
} from '@salesforce/magen-mcp-workflow';
import { PlatformEnum } from '../../common/schemas.js';
import { TempDirectoryManager } from '../../common.js';
import { BuildCommandFactory } from './types.js';
import { iOSBuildCommandFactory } from './ios/buildCommandFactory.js';
import { AndroidBuildCommandFactory } from './android/buildCommandFactory.js';

/**
 * Result of build execution
 */
export interface BuildExecutionResult {
  buildSuccessful: boolean;
  buildOutputFilePath?: string;
  exitCode?: number;
  error?: string;
}

/**
 * Parameters for build execution
 */
export interface BuildExecutionParams {
  platform: PlatformEnum;
  projectPath: string;
  projectName: string;
}

/**
 * High-level orchestration of build execution.
 * Coordinates command creation, execution, and result parsing.
 */
export interface BuildExecutor {
  /**
   * Executes a build for the specified platform and project.
   *
   * @param params - Build execution parameters
   * @param progressReporter - Optional progress reporter for sending notifications
   * @returns Build execution result
   */
  execute(
    params: BuildExecutionParams,
    progressReporter?: ProgressReporter
  ): Promise<BuildExecutionResult>;
}

/**
 * Default implementation of BuildExecutor.
 */
export class DefaultBuildExecutor implements BuildExecutor {
  private readonly commandRunner: CommandRunner;
  private readonly tempDirManager: TempDirectoryManager;
  private readonly logger: Logger;
  private readonly iosFactory: BuildCommandFactory;
  private readonly androidFactory: BuildCommandFactory;

  constructor(commandRunner: CommandRunner, tempDirManager: TempDirectoryManager, logger?: Logger) {
    this.commandRunner = commandRunner;
    this.tempDirManager = tempDirManager;
    this.logger = logger ?? createComponentLogger('BuildExecutor');
    this.iosFactory = new iOSBuildCommandFactory();
    this.androidFactory = new AndroidBuildCommandFactory();
  }

  async execute(
    params: BuildExecutionParams,
    progressReporter?: ProgressReporter
  ): Promise<BuildExecutionResult> {
    this.logger.info('Executing build', {
      platform: params.platform,
      projectPath: params.projectPath,
      projectName: params.projectName,
    });

    const buildOutputFilePath = this.tempDirManager.getBuildOutputFilePath(params.platform);
    const appArtifactRootPath = this.tempDirManager.getAppArtifactRootPath(params.projectName);

    try {
      // Get the appropriate factory for the platform
      const factory = params.platform === 'iOS' ? this.iosFactory : this.androidFactory;

      // Create build command
      const command = factory.create({
        projectPath: params.projectPath,
        projectName: params.projectName,
        buildOutputDir: appArtifactRootPath,
      });

      // Execute command with progress reporting
      const result = await this.commandRunner.execute(command.executable, command.args, {
        env: command.env,
        cwd: command.cwd,
        progressParser: (output: string, currentProgress: number) =>
          factory.parseProgress(output, currentProgress),
        progressReporter,
        outputFilePath: buildOutputFilePath,
      });

      this.logger.info('Build execution completed', {
        success: result.success,
        exitCode: result.exitCode,
        duration: result.duration,
      });

      return {
        buildSuccessful: result.success,
        buildOutputFilePath: result.success ? undefined : buildOutputFilePath,
        exitCode: result.exitCode ?? undefined,
        error: result.success ? undefined : result.stderr || result.stdout,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.info('Build execution failed', {
        error: errorMessage,
        buildOutputFilePath,
      });

      return {
        buildSuccessful: false,
        buildOutputFilePath,
        error: errorMessage,
      };
    }
  }
}
