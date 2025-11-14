/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from './abstractBaseNode.js';
import { MCPToolInvocationData } from '../common/metadata.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import { ToolExecutor, LangGraphToolExecutor } from './toolExecutor.js';
import { executeToolWithLogging } from '../utils/toolExecutionUtils.js';

/**
 * Abstract base class for nodes that execute MCP tools
 *
 * @template TState - The state type for the workflow (defaults to StateType<StateDefinition>)
 */
export abstract class AbstractToolNode<
  TState extends StateType<StateDefinition>,
> extends BaseNode<TState> {
  protected readonly logger: Logger;
  protected readonly componentName: string;
  protected readonly toolExecutor: ToolExecutor;

  constructor(name: string, toolExecutor?: ToolExecutor, logger?: Logger) {
    super(name);
    this.componentName = `WorkflowNode:${this.constructor.name}`;
    this.logger = logger ?? createComponentLogger(this.componentName);
    this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
  }

  /**
   * Protected method to execute a tool with logging and validation.
   *
   * By default, results are validated using the provided Zod schema's parse method.
   * Pass a custom validator function to implement additional validation logic.
   *
   * This method uses the common toolExecutionUtils.executeToolWithLogging function
   * to ensure consistent behavior across all tool invocations in the codebase.
   *
   * @param toolInvocationData The tool invocation data to pass to the tool executor
   * @param resultSchema The schema to validate the result against
   * @param validator Optional custom validator function
   * @returns The validated result from the tool execution
   */
  protected executeToolWithLogging<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    toolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>,
    resultSchema: TResultSchema,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    return executeToolWithLogging(
      this.toolExecutor,
      this.logger,
      toolInvocationData,
      resultSchema,
      validator
    );
  }
}
