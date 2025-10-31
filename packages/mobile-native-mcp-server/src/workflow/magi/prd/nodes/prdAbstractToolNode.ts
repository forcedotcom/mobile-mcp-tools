/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PRDBaseNode } from './prdBaseNode.js';
import { ToolExecutor, LangGraphToolExecutor } from '../../../nodes/toolExecutor.js';
import { executeToolWithLogging } from '../../../utils/toolExecutionUtils.js';
import { createComponentLogger, Logger } from '../../../../logging/logger.js';
import { MCPToolInvocationData } from '../../../../common/metadata.js';

/**
 * Abstract base class for PRD workflow nodes that invoke MCP tools.
 * Provides standardized tool execution with logging and error handling.
 */
export abstract class PRDAbstractToolNode extends PRDBaseNode {
  protected readonly toolExecutor: ToolExecutor;
  protected readonly logger: Logger;
  protected readonly componentName: string;

  constructor(name: string, toolExecutor?: ToolExecutor, logger?: Logger) {
    super(name);
    this.componentName = `WorkflowNode:${this.name}`;
    this.logger = logger ?? createComponentLogger(this.componentName);
    this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
  }

  /**
   * Execute a tool with standardized logging and error handling
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
