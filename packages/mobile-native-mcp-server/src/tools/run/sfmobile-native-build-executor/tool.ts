/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, createComponentLogger } from '../../../logging/logger.js';
import { BUILD_EXECUTOR_TOOL, BuildExecutorResult } from './metadata.js';
import { TempDirectoryManager, defaultTempDirectoryManager } from '../../../common.js';
import { AndroidBuildStrategy, BuildStrategy, IOSBuildStrategy } from './build-strategies/index.js';

export class SFMobileNativeBuildExecutor {
  private readonly server: McpServer;
  private readonly logger: Logger;
  private readonly tempDirManager: TempDirectoryManager;
  private readonly buildStrategies: Map<string, BuildStrategy>;

  constructor(server: McpServer, logger?: Logger, tempDirManager?: TempDirectoryManager) {
    this.server = server;
    this.logger = logger ?? createComponentLogger('BuildExecutor');
    this.tempDirManager = tempDirManager ?? defaultTempDirectoryManager;

    this.buildStrategies = new Map<string, BuildStrategy>();
    this.buildStrategies.set('iOS', new IOSBuildStrategy(this.logger, this.tempDirManager));
    this.buildStrategies.set('Android', new AndroidBuildStrategy(this.logger, this.tempDirManager));
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
          const strategy = this.buildStrategies.get(input.platform);
          if (!strategy) {
            throw new Error(`Unsupported platform: ${input.platform}`);
          }
          result = await strategy.build(input.projectPath, sendProgress);
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
}
