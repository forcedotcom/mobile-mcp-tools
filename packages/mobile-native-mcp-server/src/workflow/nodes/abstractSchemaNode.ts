/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { BaseNode } from './abstractBaseNode.js';
import { MCPToolInvocationData } from '../../common/metadata.js';
import { Logger, createComponentLogger } from '../../logging/logger.js';
import { ToolExecutor, LangGraphToolExecutor } from './toolExecutor.js';

export abstract class AbstractSchemaNode extends BaseNode {
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
    this.logger.debug('Tool invocation data (pre-execution)', { toolInvocationData });

    const result = this.toolExecutor.execute(toolInvocationData);

    this.logger.debug('Tool execution result (post-execution)', { result });

    return validator ? validator(result, resultSchema) : resultSchema.parse(result);
  }
}
