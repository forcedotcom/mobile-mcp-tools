/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { ToolExecutor, LangGraphToolExecutor } from '../nodes/toolExecutor.js';
import { Logger, createComponentLogger } from '../../logging/logger.js';
import { BUILD_TOOL } from '../../tools/plan/sfmobile-native-build/metadata.js';
import { PlatformEnum } from '../../common/schemas.js';

/**
 * Result of a single build validation attempt
 */
export interface BuildValidationResult {
  buildSuccessful: boolean;
  buildOutputFilePath?: string;
}

/**
 * Parameters for build validation
 */
export interface BuildValidationParams {
  platform: PlatformEnum;
  projectPath: string;
  projectName: string;
}

/**
 * Provider interface for build validation service.
 * This interface allows for dependency injection and testing.
 */
export interface BuildValidationServiceProvider {
  /**
   * Executes a single build attempt.
   *
   * @param params - Build validation parameters
   * @returns Build validation result
   */
  executeBuild(params: BuildValidationParams): BuildValidationResult;
}

/**
 * Service for executing a single build validation.
 * The retry/recovery loop is handled at the workflow graph level, not in this service.
 */
export class BuildValidationService implements BuildValidationServiceProvider {
  private readonly logger: Logger;
  private readonly toolExecutor: ToolExecutor;

  /**
   * Creates a new BuildValidationService.
   *
   * @param toolExecutor - Tool executor for invoking build tool (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
    this.logger = logger ?? createComponentLogger('BuildValidationService');
  }

  executeBuild(params: BuildValidationParams): BuildValidationResult {
    this.logger.info('Executing build', {
      platform: params.platform,
      projectPath: params.projectPath,
    });

    const toolInvocationData: MCPToolInvocationData<typeof BUILD_TOOL.inputSchema> = {
      llmMetadata: {
        name: BUILD_TOOL.toolId,
        description: BUILD_TOOL.description,
        inputSchema: BUILD_TOOL.inputSchema,
      },
      input: {
        platform: params.platform,
        projectPath: params.projectPath,
        projectName: params.projectName,
      },
    };

    const rawResult = this.toolExecutor.execute(toolInvocationData);
    const validatedResult = BUILD_TOOL.resultSchema.parse(rawResult);

    this.logger.info('Build completed', {
      buildSuccessful: validatedResult.buildSuccessful,
    });

    return validatedResult;
  }
}
