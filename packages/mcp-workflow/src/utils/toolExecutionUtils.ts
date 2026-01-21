/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { InterruptData } from '../common/metadata.js';
import { Logger } from '../logging/logger.js';
import { ToolExecutor } from '../nodes/toolExecutor.js';

/**
 * Executes a tool with logging and validation.
 *
 * This utility provides a standardized pattern for tool execution that includes:
 * - Pre-execution logging of interrupt data
 * - Tool execution via the provided executor
 * - Post-execution logging of results
 * - Result validation using Zod schemas
 * - Optional custom validation logic
 *
 * This function is used by both workflow nodes (via AbstractToolNode) and
 * services (via AbstractService) to ensure consistent tool execution patterns
 * across the codebase.
 *
 * @param toolExecutor - The executor to use for running the tool
 * @param logger - Logger instance for recording execution details
 * @param interruptData - The interrupt data (MCPToolInvocationData or NodeGuidanceData)
 * @param resultSchema - Zod schema to validate the result against
 * @param validator - Optional custom validator function for additional validation logic
 * @returns The validated result from the tool execution
 *
 * @throws {z.ZodError} If the result does not match the schema (when using default validation)
 * @throws {Error} If tool execution fails or custom validator throws
 *
 * @example
 * // Basic usage with schema validation
 * const result = executeToolWithLogging(
 *   toolExecutor,
 *   logger,
 *   interruptData,
 *   MyToolResultSchema
 * );
 *
 * @example
 * // With custom validator
 * const result = executeToolWithLogging(
 *   toolExecutor,
 *   logger,
 *   interruptData,
 *   MyToolResultSchema,
 *   (result, schema) => {
 *     const validated = schema.parse(result);
 *     // Additional custom validation or transformation
 *     if (validated.someField < 0) {
 *       throw new Error('Value must be positive');
 *     }
 *     return validated;
 *   }
 * );
 */
export function executeToolWithLogging<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
  toolExecutor: ToolExecutor,
  logger: Logger,
  interruptData: InterruptData<z.ZodObject<z.ZodRawShape>>,
  resultSchema: TResultSchema,
  validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
): z.infer<TResultSchema> {
  logger.debug('Interrupt data (pre-execution)', { interruptData });

  const result = toolExecutor.execute(interruptData);

  logger.debug('Tool execution result (post-execution)', { result });

  if (validator) {
    return validator(result, resultSchema);
  } else {
    const validatedResult = resultSchema.parse(result);
    logger.debug('Validated tool result', { validatedResult });
    return validatedResult;
  }
}
