/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  createComponentLogger,
  LangGraphToolExecutor,
  Logger,
  MCPToolInvocationData,
  ToolExecutor,
} from '@salesforce/magen-mcp-workflow';
import { BUILD_RECOVERY_TOOL } from '../../tools/plan/sfmobile-native-build-recovery/metadata.js';
import { PlatformEnum } from '../../common/schemas.js';

/**
 * Result of a build recovery attempt
 */
export interface BuildRecoveryResult {
  fixesAttempted: string[];
  readyForRetry: boolean;
}

/**
 * Parameters for build recovery
 */
export interface BuildRecoveryParams {
  platform: PlatformEnum;
  projectPath: string;
  projectName: string;
  buildOutputFilePath: string;
  attemptNumber: number;
}

/**
 * Provider interface for build recovery service.
 * This interface allows for dependency injection and testing.
 */
export interface BuildRecoveryServiceProvider {
  /**
   * Attempts to recover from a build failure by analyzing errors and applying fixes.
   *
   * @param params - Build recovery parameters
   * @returns Build recovery result
   */
  attemptRecovery(params: BuildRecoveryParams): BuildRecoveryResult;
}

/**
 * Service for attempting build failure recovery.
 * Analyzes build output and attempts to fix common issues.
 */
export class BuildRecoveryService implements BuildRecoveryServiceProvider {
  private readonly logger: Logger;
  private readonly toolExecutor: ToolExecutor;

  /**
   * Creates a new BuildRecoveryService.
   *
   * @param toolExecutor - Tool executor for invoking recovery tool (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
    this.logger = logger ?? createComponentLogger('BuildRecoveryService');
  }

  attemptRecovery(params: BuildRecoveryParams): BuildRecoveryResult {
    this.logger.info('Attempting build recovery', {
      platform: params.platform,
      attemptNumber: params.attemptNumber,
    });

    const toolInvocationData: MCPToolInvocationData<typeof BUILD_RECOVERY_TOOL.inputSchema> = {
      llmMetadata: {
        name: BUILD_RECOVERY_TOOL.toolId,
        description: BUILD_RECOVERY_TOOL.description,
        inputSchema: BUILD_RECOVERY_TOOL.inputSchema,
      },
      input: {
        platform: params.platform,
        projectPath: params.projectPath,
        projectName: params.projectName,
        buildOutputFilePath: params.buildOutputFilePath,
        attemptNumber: params.attemptNumber,
      },
    };

    const rawResult = this.toolExecutor.execute(toolInvocationData);
    const validatedResult = BUILD_RECOVERY_TOOL.resultSchema.parse(rawResult);

    this.logger.info('Build recovery completed', {
      fixesAttempted: validatedResult.fixesAttempted,
      readyForRetry: validatedResult.readyForRetry,
    });

    return validatedResult;
  }
}
