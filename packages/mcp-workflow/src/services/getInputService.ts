/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ToolExecutor } from '../nodes/toolExecutor.js';
import { AbstractService } from './abstractService.js';
import {
  createGetInputMetadata,
  GET_INPUT_WORKFLOW_INPUT_SCHEMA,
  GET_INPUT_WORKFLOW_RESULT_SCHEMA,
} from '../tools/utilities/index.js';
import { Logger } from '../logging/logger.js';
import { MCPToolInvocationData } from '../common/metadata.js';

export interface GetInputProperty {
  /** Property name to be collected */
  readonly propertyName: string;

  /** Human-readable name for display */
  readonly friendlyName: string;

  /** Detailed description for LLM-based extraction */
  readonly description: string;

  /** Optional reason why the property is unfulfilled */
  readonly reason?: string;
}

/**
 * Provider interface for user input service.
 * This interface allows for dependency injection and testing.
 */
export interface GetInputServiceProvider {
  /**
   * Solicits user input with a given question.
   *
   * @param question - The question to ask the user
   * @returns The user's response (can be any type)
   */
  getInput(unfulfilledProperties: GetInputProperty[]): unknown;
}

/**
 * Service for getting user input for a given question.
 *
 * This service extends AbstractService to leverage common tool execution
 * patterns including standardized logging and result validation.
 */
export class GetInputService extends AbstractService implements GetInputServiceProvider {
  /**
   * Creates a new GetInputService.
   *
   * @param toolExecutor - Tool executor for invoking the input tool (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(
    private readonly toolId: string,
    toolExecutor?: ToolExecutor,
    logger?: Logger
  ) {
    super('GetInputService', toolExecutor, logger);
  }

  getInput(unfulfilledProperties: GetInputProperty[]): unknown {
    this.logger.debug('Starting input request with properties', {
      unfulfilledProperties,
    });

    const metadata = createGetInputMetadata(this.toolId);
    // Create tool invocation data
    const toolInvocationData: MCPToolInvocationData<typeof GET_INPUT_WORKFLOW_INPUT_SCHEMA> = {
      llmMetadata: {
        name: metadata.toolId,
        description: metadata.description,
        inputSchema: metadata.inputSchema,
      },
      input: {
        propertiesRequiringInput: unfulfilledProperties,
      },
    };

    // Execute tool with logging and validation
    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GET_INPUT_WORKFLOW_RESULT_SCHEMA
    );

    return validatedResult.userUtterance;
  }
}
