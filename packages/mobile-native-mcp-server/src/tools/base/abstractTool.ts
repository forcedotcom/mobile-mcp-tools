/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ZodRawShape, ZodObject, z, ZodTypeAny } from 'zod';
import { Logger, createToolLogger } from '../../logging/index.js';
import { WorkflowStateData } from '../../workflow/schemas.js';

/**
 * Abstract base class for ALL MCP tools in the mobile native server
 *
 * Provides comprehensive functionality including:
 * - Server instance management
 * - Logging with component identification
 * - Standardized registration pattern
 * - Workflow state round-tripping support
 * - Post-invocation instruction patterns
 * - Shared utility methods
 *
 * @template InputArgs - Zod schema shape for tool input
 * @template OutputArgs - Zod schema shape for tool output
 */
export abstract class AbstractTool<
  InputArgs extends ZodRawShape = ZodRawShape,
  OutputArgs extends ZodRawShape = ZodRawShape,
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly server: McpServer,
    componentName?: string,
    logger?: Logger
  ) {
    this.logger = logger || createToolLogger(componentName || this.constructor.name);
  }

  // Abstract properties that implementing tools must define
  abstract readonly name: string;
  abstract readonly title: string;
  abstract readonly description: string;
  abstract readonly toolId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract readonly inputSchema: ZodObject<InputArgs, any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract readonly outputSchema?: ZodObject<OutputArgs, any, any>;

  /**
   * Register the tool with the MCP server
   * @param annotations Tool annotations for MCP client hints
   */
  public register(annotations: ToolAnnotations): void {
    this.logRegistration(annotations);

    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
    };

    this.server.registerTool<InputArgs, OutputArgs>(
      this.toolId,
      {
        description: this.description,
        inputSchema: this.inputSchema.shape,
        outputSchema: this.outputSchema?.shape,
        ...enhancedAnnotations,
      },
      this.handleRequest.bind(this)
    );
  }

  /**
   * Abstract method that implementing tools must provide for handling requests
   *
   * Uses the same typing pattern as registerTool() ToolCallback<InputArgs> for perfect 1:1 type matching
   * Input: z.objectOutputType<InputArgs, ZodTypeAny> (parsed/validated object)
   * Return: CallToolResult | Promise<CallToolResult>
   */
  protected abstract handleRequest(
    input: z.objectOutputType<InputArgs, ZodTypeAny>
  ): Promise<CallToolResult>;

  /**
   * Logs tool registration information
   * @param annotations The tool annotations
   */
  protected logRegistration(annotations: ToolAnnotations): void {
    this.logger.info(`Registering MCP tool: ${this.toolId}`, { annotations });
  }

  /**
   * Logs an error that occurred during tool execution
   * @param message A descriptive error message
   * @param error The error object
   * @param data Additional context data
   */
  protected logError(message: string, error: Error, data?: unknown): void {
    this.logger.error(message, error);
    if (data) {
      this.logger.debug('Error context data', data);
    }
  }

  /**
   * Creates a child logger for a specific operation within the tool
   * @param operationName The name of the operation
   * @returns A child logger instance
   */
  protected createOperationLogger(operationName: string): Logger {
    return this.logger.child({ operation: operationName });
  }

  /**
   * Utility method for tools to add post-invocation instructions
   * that guide the LLM back to the orchestrator for workflow continuation
   *
   * @param prompt The main tool response prompt
   * @param toolOutputDescription Description of what the tool output represents
   * @param workflowStateData Workflow state data to round-trip back to orchestrator
   * @returns Complete prompt with post-invocation instructions
   */
  protected addPostInvocationInstructions(
    prompt: string,
    toolOutputDescription: string,
    workflowStateData?: WorkflowStateData
  ): string {
    const postInstructions = `

# Post-Tool-Invocation Instructions

After this prompt has been processed, you MUST initiate the following actions to proceed with the in-progress workflow:

- Invoke the \`sfmobile-native-project-manager\` tool with the following input:
  - \`userInput\`: ${toolOutputDescription}
  - \`workflowStateData\`: ${JSON.stringify(workflowStateData || {})}

This will continue the workflow orchestration process.`;

    return prompt + postInstructions;
  }

  /**
   * Logs workflow-specific events with enhanced context
   * @param event The workflow event description
   * @param data Additional workflow context data
   */
  protected logWorkflowEvent(event: string, data?: Record<string, unknown>): void {
    this.logger.info(event, {
      ...(data || {}),
      workflowTool: true,
      toolId: this.toolId,
    });
  }
}
