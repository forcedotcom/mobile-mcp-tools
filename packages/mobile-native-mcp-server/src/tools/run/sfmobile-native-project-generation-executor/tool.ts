/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, createComponentLogger } from '../../../logging/logger.js';
import { PROJECT_GENERATION_EXECUTOR_TOOL, ProjectGenerationExecutorResult } from './metadata.js';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../../constants.js';

export class SFMobileNativeProjectGenerationExecutor {
  private readonly server: McpServer;
  private readonly logger: Logger;

  constructor(server: McpServer, logger?: Logger) {
    this.server = server;
    this.logger = logger ?? createComponentLogger('ProjectGenerationExecutor');
  }

  public register(): void {
    this.server.tool(
      PROJECT_GENERATION_EXECUTOR_TOOL.toolId,
      PROJECT_GENERATION_EXECUTOR_TOOL.description,
      PROJECT_GENERATION_EXECUTOR_TOOL.inputSchema.shape,
      async (args, { sendNotification, _meta }) => {
        const input = PROJECT_GENERATION_EXECUTOR_TOOL.inputSchema.parse(args);
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
            data: `Generating ${input.platform} project: ${input.projectName}`,
          },
        });

        const result = await this.generateProject(input, sendProgress);

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

  private async generateProject(
    input: {
      selectedTemplate: string;
      projectName: string;
      platform: string;
      packageName: string;
      organization: string;
      connectedAppClientId: string;
      connectedAppCallbackUri: string;
      loginHost?: string;
    },
    sendProgress: (message: string, progress: number, total: number) => Promise<void>
  ): Promise<ProjectGenerationExecutorResult> {
    await sendProgress('Starting project generation...', 0, 100);

    const platformLower = input.platform.toLowerCase();
    const workingDir = process.cwd();

    // Build the command
    const args = [
      'mobilesdk',
      platformLower,
      'createwithtemplate',
      `--templatesource=${MOBILE_SDK_TEMPLATES_PATH}`,
      `--template=${input.selectedTemplate}`,
      `--appname=${input.projectName}`,
      `--packagename=${input.packageName}`,
      `--organization=${input.organization}`,
    ];

    this.logger.info('Executing project generation command', {
      command: 'sf',
      args: args.join(' '),
      workingDir,
    });

    await sendProgress('Running sf mobilesdk command...', 10, 100);

    return new Promise(resolve => {
      const generateProcess: ChildProcess = spawn('sf', args, {
        cwd: workingDir,
      });

      let output = '';
      let errorOutput = '';
      let lastProgress = 10;
      let currentPhase = 'Generating project';
      let lastProgressUpdate = Date.now();
      const MIN_PROGRESS_INTERVAL = 2000; // Send progress at least every 2 seconds

      // Set up interval timer to ensure progress updates even during long phases
      const progressInterval = setInterval(async () => {
        const now = Date.now();
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress slowly to show activity
          if (lastProgress < 90) {
            lastProgress = Math.min(90, lastProgress + 2);
            await sendProgress(`${currentPhase}...`, lastProgress, 100);
            lastProgressUpdate = now;
          }
        }
      }, MIN_PROGRESS_INTERVAL);

      generateProcess.stdout?.on('data', async (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.logger.debug('Generation output:', { output: text });

        const now = Date.now();
        // Send progress update on any output if enough time has passed
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress to show activity
          if (lastProgress < 90) {
            lastProgress = Math.min(90, lastProgress + 2);
          }

          // Detect phase for better messaging
          if (text.includes('Creating') || text.includes('creating')) {
            currentPhase = 'Creating project structure';
            lastProgress = Math.max(lastProgress, 30);
          } else if (text.includes('Copying') || text.includes('copying')) {
            currentPhase = 'Copying template files';
            lastProgress = Math.max(lastProgress, 50);
          } else if (text.includes('Installing') || text.includes('installing')) {
            currentPhase = 'Installing dependencies';
            lastProgress = Math.max(lastProgress, 70);
          } else if (text.includes('Configuring') || text.includes('configuring')) {
            currentPhase = 'Configuring project';
            lastProgress = Math.max(lastProgress, 80);
          } else if (text.includes('bootconfig')) {
            currentPhase = 'Setting up OAuth configuration';
            lastProgress = Math.max(lastProgress, 85);
          }

          await sendProgress(`${currentPhase}...`, lastProgress, 100);
          lastProgressUpdate = now;
        }
      });

      generateProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        this.logger.debug('Generation error output:', { error: text });

        // SF CLI often outputs progress info to stderr, so check for useful info
        if (text.includes('Creating') || text.includes('copying') || text.includes('Installing')) {
          output += text; // Add to output for context
        }
      });

      generateProcess.on('close', async (code: number | null) => {
        clearInterval(progressInterval);

        if (code === 0) {
          await sendProgress('Project generation completed!', 95, 100);

          // Determine the project path
          const projectPath = path.join(workingDir, input.projectName);

          // Verify the project was created
          if (fs.existsSync(projectPath)) {
            this.logger.info('Project generated successfully', { projectPath });
            await sendProgress('Finalizing project setup...', 100, 100);
            resolve({
              success: true,
              message: `Project ${input.projectName} generated successfully`,
              projectPath,
              output: output.substring(Math.max(0, output.length - 1000)),
            });
          } else {
            this.logger.warn('Project directory not found after generation', { projectPath });
            resolve({
              success: false,
              message: 'Project generation completed but directory not found',
              error: `Expected project at ${projectPath}`,
              output: output.substring(Math.max(0, output.length - 1000)),
            });
          }
        } else {
          await sendProgress('Project generation failed', 100, 100);
          const error = new Error(
            `Project generation failed with exit code ${code}\nOutput: ${output}\nError: ${errorOutput}`
          );
          this.logger.error('Project generation failed', error);
          resolve({
            success: false,
            message: `Project generation failed with exit code ${code}`,
            output: output.substring(Math.max(0, output.length - 1000)),
            error: errorOutput.substring(Math.max(0, errorOutput.length - 1000)),
          });
        }
      });

      generateProcess.on('error', async (error: Error) => {
        clearInterval(progressInterval);
        await sendProgress('Project generation error', 100, 100);
        this.logger.error('Failed to start project generation', error);
        resolve({
          success: false,
          message: 'Failed to start project generation command',
          error: error.message,
        });
      });
    });
  }
}
