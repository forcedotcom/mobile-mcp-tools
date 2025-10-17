/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, createComponentLogger } from '../../../logging/logger.js';
import { BUILD_EXECUTOR_TOOL, BuildExecutorResult } from './metadata.js';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class SFMobileNativeBuildExecutor {
  private readonly server: McpServer;
  private readonly logger: Logger;

  constructor(server: McpServer, logger?: Logger) {
    this.server = server;
    this.logger = logger ?? createComponentLogger('BuildExecutor');
  }

  public register(): void {
    this.server.tool(
      BUILD_EXECUTOR_TOOL.toolId,
      BUILD_EXECUTOR_TOOL.description,
      BUILD_EXECUTOR_TOOL.inputSchema.shape,
      async (args, { sendNotification, _meta }) => {
        const input = BUILD_EXECUTOR_TOOL.inputSchema.parse(args);
        const progressToken = _meta?.progressToken;

        const sendProgress = async (message: string, progress: number, total: number) => {
          try {
            if (progressToken !== undefined) {
              await sendNotification({
                method: 'notifications/progress',
                params: {
                  progressToken,
                  message,
                  progress,
                  total,
                },
              });
            }
          } catch (error) {
            this.logger.warn('Failed to send progress notification', { error });
          }
        };

        await sendNotification({
          method: 'notifications/message',
          params: {
            level: 'info',
            data: `Starting ${input.platform} build at ${input.projectPath}`,
          },
        });

        let result: BuildExecutorResult;
        try {
          if (input.platform === 'iOS') {
            result = await this.buildIOS(input.projectPath, sendProgress);
          } else if (input.platform === 'Android') {
            result = await this.buildAndroid(input.projectPath, sendProgress);
          } else {
            throw new Error(`Unsupported platform: ${input.platform}`);
          }
        } catch (error) {
          result = {
            success: false,
            message: 'Build execution failed',
            error: error instanceof Error ? error.message : String(error),
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
  }

  private async buildIOS(
    projectPath: string,
    sendProgress: (message: string, progress: number, total: number) => Promise<void>
  ): Promise<BuildExecutorResult> {
    await sendProgress('Starting iOS build...', 0, 100);

    // Find workspace or xcodeproj
    const projectFiles = fs.readdirSync(projectPath);
    const workspace = projectFiles.find(f => f.endsWith('.xcworkspace'));
    const xcodeproj = projectFiles.find(f => f.endsWith('.xcodeproj'));

    if (!workspace && !xcodeproj) {
      return {
        success: false,
        message: 'No Xcode workspace or project found',
        error: 'Could not find .xcworkspace or .xcodeproj file',
      };
    }

    const projectFile = workspace ?? xcodeproj;
    if (!projectFile) {
      return {
        success: false,
        message: 'No Xcode workspace or project found',
        error: 'Could not find project file',
      };
    }

    const projectFlag = workspace ? '-workspace' : '-project';

    // Get scheme - try to find the first scheme
    const schemePath = workspace
      ? path.join(projectPath, workspace, 'xcshareddata', 'xcschemes')
      : path.join(projectPath, xcodeproj!, 'xcshareddata', 'xcschemes');

    let scheme = '';
    if (fs.existsSync(schemePath)) {
      const schemes = fs.readdirSync(schemePath).filter(f => f.endsWith('.xcscheme'));
      if (schemes.length > 0) {
        scheme = schemes[0].replace('.xcscheme', '');
      }
    }

    if (!scheme) {
      // Fallback: use the project name without extension
      scheme = projectFile.replace(/\.(xcworkspace|xcodeproj)$/, '');
    }

    await sendProgress(`Building iOS project with scheme: ${scheme}`, 10, 100);

    return new Promise(resolve => {
      const buildProcess: ChildProcess = spawn(
        'xcodebuild',
        [
          projectFlag,
          projectFile,
          '-scheme',
          scheme,
          '-destination',
          'generic/platform=iOS Simulator',
          'clean',
          'build',
        ],
        {
          cwd: projectPath,
        }
      );

      let output = '';
      let errorOutput = '';
      let lastProgress = 10;
      let currentPhase = 'Building';
      let lastProgressUpdate = Date.now();
      const MIN_PROGRESS_INTERVAL = 2000; // Send progress at least every 2 seconds

      // Set up interval timer to ensure progress updates even during long phases
      const progressInterval = setInterval(async () => {
        const now = Date.now();
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress slowly to show activity
          if (lastProgress < 95) {
            lastProgress = Math.min(95, lastProgress + 1);
            await sendProgress(`${currentPhase}...`, lastProgress, 100);
            lastProgressUpdate = now;
          }
        }
      }, MIN_PROGRESS_INTERVAL);

      buildProcess.stdout?.on('data', async (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.logger.debug('Build output:', { output: text });

        const now = Date.now();
        // Send progress update on any output if enough time has passed
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress to show activity
          if (lastProgress < 95) {
            lastProgress = Math.min(95, lastProgress + 1);
          }

          // Detect build phase for better messaging
          if (text.includes('Build settings')) {
            currentPhase = 'Preparing build settings';
            lastProgress = Math.max(lastProgress, 20);
          } else if (text.includes('CompileSwift') || text.includes('CompileSwiftSources')) {
            currentPhase = 'Compiling Swift files';
            lastProgress = Math.max(lastProgress, 40);
          } else if (text.includes('CompileC')) {
            currentPhase = 'Compiling source files';
            lastProgress = Math.max(lastProgress, 45);
          } else if (text.includes('Ld ') || text.includes('Link ')) {
            currentPhase = 'Linking';
            lastProgress = Math.max(lastProgress, 70);
          } else if (text.includes('CodeSign')) {
            currentPhase = 'Code signing';
            lastProgress = Math.max(lastProgress, 90);
          } else if (text.includes('ProcessInfoPlistFile')) {
            currentPhase = 'Processing Info.plist';
            lastProgress = Math.max(lastProgress, 30);
          }

          await sendProgress(`${currentPhase}...`, lastProgress, 100);
          lastProgressUpdate = now;
        }
      });

      buildProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
        this.logger.debug('Build error output:', { error: data.toString() });
      });

      buildProcess.on('close', async (code: number | null) => {
        clearInterval(progressInterval);
        if (code === 0) {
          await sendProgress('iOS build completed successfully!', 100, 100);
          this.logger.info('iOS build successful');
          resolve({
            success: true,
            message: 'iOS build completed successfully',
            output: output.substring(Math.max(0, output.length - 1000)), // Last 1000 chars
          });
        } else {
          await sendProgress('iOS build failed', 100, 100);
          const error = new Error(
            `iOS build failed with exit code ${code}\nOutput: ${output}\nError: ${errorOutput}`
          );
          this.logger.error('iOS build failed', error);
          resolve({
            success: false,
            message: `iOS build failed with exit code ${code}`,
            output: output.substring(Math.max(0, output.length - 1000)),
            error: errorOutput.substring(Math.max(0, errorOutput.length - 1000)),
          });
        }
      });

      buildProcess.on('error', async (error: Error) => {
        clearInterval(progressInterval);
        await sendProgress('iOS build error', 100, 100);
        this.logger.error('Failed to start iOS build', error);
        resolve({
          success: false,
          message: 'Failed to start iOS build',
          error: error.message,
        });
      });
    });
  }

  private async buildAndroid(
    projectPath: string,
    sendProgress: (message: string, progress: number, total: number) => Promise<void>
  ): Promise<BuildExecutorResult> {
    await sendProgress('Starting Android build...', 0, 100);

    const gradlewPath = path.join(projectPath, 'gradlew');

    if (!fs.existsSync(gradlewPath)) {
      return {
        success: false,
        message: 'Gradle wrapper not found',
        error: `gradlew not found at ${gradlewPath}`,
      };
    }

    // Make gradlew executable
    fs.chmodSync(gradlewPath, '755');

    await sendProgress('Building Android project...', 10, 100);

    return new Promise(resolve => {
      const buildProcess: ChildProcess = spawn('./gradlew', ['build'], {
        cwd: projectPath,
      });

      let output = '';
      let errorOutput = '';
      let lastProgress = 10;
      let currentPhase = 'Building';
      let lastProgressUpdate = Date.now();
      const MIN_PROGRESS_INTERVAL = 2000; // Send progress at least every 2 seconds

      // Set up interval timer to ensure progress updates even during long phases
      const progressInterval = setInterval(async () => {
        const now = Date.now();
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress slowly to show activity
          if (lastProgress < 95) {
            lastProgress = Math.min(95, lastProgress + 1);
            await sendProgress(`${currentPhase}...`, lastProgress, 100);
            lastProgressUpdate = now;
          }
        }
      }, MIN_PROGRESS_INTERVAL);

      buildProcess.stdout?.on('data', async (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.logger.debug('Build output:', { output: text });

        const now = Date.now();
        // Send progress update on any output if enough time has passed
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress to show activity
          if (lastProgress < 95) {
            lastProgress = Math.min(95, lastProgress + 1);
          }

          // Detect build phase for better messaging
          if (text.includes('preBuild')) {
            currentPhase = 'Running pre-build tasks';
            lastProgress = Math.max(lastProgress, 20);
          } else if (text.includes('compileDebugKotlin') || text.includes('compileKotlin')) {
            currentPhase = 'Compiling Kotlin';
            lastProgress = Math.max(lastProgress, 40);
          } else if (text.includes('compileDebugJavaWithJavac') || text.includes('compileJava')) {
            currentPhase = 'Compiling Java';
            lastProgress = Math.max(lastProgress, 50);
          } else if (text.includes('mergeDebugResources') || text.includes('mergeResources')) {
            currentPhase = 'Merging resources';
            lastProgress = Math.max(lastProgress, 60);
          } else if (text.includes('dexBuilder') || text.includes('mergeDex')) {
            currentPhase = 'Processing DEX files';
            lastProgress = Math.max(lastProgress, 75);
          } else if (text.includes('packageDebug') || text.includes('package')) {
            currentPhase = 'Packaging application';
            lastProgress = Math.max(lastProgress, 85);
          } else if (text.includes('BUILD SUCCESSFUL')) {
            currentPhase = 'Finalizing build';
            lastProgress = Math.max(lastProgress, 95);
          }

          await sendProgress(`${currentPhase}...`, lastProgress, 100);
          lastProgressUpdate = now;
        }
      });

      buildProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
        this.logger.debug('Build error output:', { error: data.toString() });
      });

      buildProcess.on('close', async (code: number | null) => {
        clearInterval(progressInterval);
        if (code === 0) {
          await sendProgress('Android build completed successfully!', 100, 100);
          this.logger.info('Android build successful');
          resolve({
            success: true,
            message: 'Android build completed successfully',
            output: output.substring(Math.max(0, output.length - 1000)),
          });
        } else {
          await sendProgress('Android build failed', 100, 100);
          const error = new Error(
            `Android build failed with exit code ${code}\nOutput: ${output}\nError: ${errorOutput}`
          );
          this.logger.error('Android build failed', error);
          resolve({
            success: false,
            message: `Android build failed with exit code ${code}`,
            output: output.substring(Math.max(0, output.length - 1000)),
            error: errorOutput.substring(Math.max(0, errorOutput.length - 1000)),
          });
        }
      });

      buildProcess.on('error', async (error: Error) => {
        clearInterval(progressInterval);
        await sendProgress('Android build error', 100, 100);
        this.logger.error('Failed to start Android build', error);
        resolve({
          success: false,
          message: 'Failed to start Android build',
          error: error.message,
        });
      });
    });
  }
}
