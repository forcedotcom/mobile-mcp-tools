/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { InterruptData } from '../common/metadata.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import { ToolExecutor, LangGraphToolExecutor } from '../nodes/toolExecutor.js';
import { executeToolWithLogging } from '../utils/toolExecutionUtils.js';

/**
 * Abstract base class for services that execute MCP tools.
 *
 * This class provides a standardized pattern for services that need to invoke
 * MCP tools with proper logging, error handling, and result validation. It mirrors
 * the functionality of AbstractToolNode but is designed for service-layer components
 * that don't participate in the LangGraph workflow state machine.
 *
 * Features:
 * - Dependency injection support for ToolExecutor and Logger
 * - Automatic component naming and logger initialization
 * - Common tool execution pattern with comprehensive logging
 * - Result validation using Zod schemas
 * - Optional custom validation logic
 *
 * Services that extend this class should:
 * 1. Call super() in their constructor, optionally passing toolExecutor and logger
 * 2. Use executeToolWithLogging() to invoke tools
 * 3. Implement their business logic around the tool invocations
 *
 * @example
 * export class MyService extends AbstractService {
 *   constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
 *     super('MyService', toolExecutor, logger);
 *   }
 *
 *   doSomething(input: string): ResultType {
 *     const interruptData = { ... };
 *     return this.executeToolWithLogging(
 *       interruptData,
 *       MyToolResultSchema
 *     );
 *   }
 * }
 */
export abstract class AbstractService {
  protected readonly logger: Logger;
  protected readonly componentName: string;
  protected readonly toolExecutor: ToolExecutor;

  /**
   * Creates a new AbstractService.
   *
   * @param serviceName - Name of the service (used for logging and component identification)
   * @param toolExecutor - Tool executor for invoking MCP tools (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(serviceName: string, toolExecutor?: ToolExecutor, logger?: Logger) {
    this.componentName = `Service:${serviceName}`;
    this.logger = logger ?? createComponentLogger(this.componentName);
    this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
  }

  /**
   * Protected method to execute a tool with logging and validation.
   *
   * By default, results are validated using the provided Zod schema's parse method.
   * Pass a custom validator function to implement additional validation logic or
   * transformation of the result.
   *
   * This method uses the common toolExecutionUtils.executeToolWithLogging function
   * to ensure consistent behavior across all tool invocations in the codebase.
   *
   * @param interruptData - The interrupt data (MCPToolInvocationData or NodeGuidanceData)
   * @param resultSchema - The schema to validate the result against
   * @param validator - Optional custom validator function
   * @returns The validated result from the tool execution
   *
   * @throws {z.ZodError} If the result does not match the schema (when using default validation)
   * @throws {Error} If tool execution fails or custom validator throws
   */
  protected executeToolWithLogging<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    interruptData: InterruptData<z.ZodObject<z.ZodRawShape>>,
    resultSchema: TResultSchema,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    return executeToolWithLogging(
      this.toolExecutor,
      this.logger,
      interruptData,
      resultSchema,
      validator
    );
  }
}
