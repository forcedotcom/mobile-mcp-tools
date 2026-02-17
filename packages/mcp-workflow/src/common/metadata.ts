/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

/**
 * Workflow state data schema for round-tripping session identity
 * This lightweight object maintains workflow session continuity across stateless MCP tool invocations
 */
export const WORKFLOW_STATE_DATA_SCHEMA = z.object({
  thread_id: z.string().describe('Unique identifier for the workflow session'),
});

export type WorkflowStateData = z.infer<typeof WORKFLOW_STATE_DATA_SCHEMA>;

/**
 * Workflow property names - single source of truth for property naming
 */
export const WORKFLOW_PROPERTY_NAMES = {
  workflowStateData: 'workflowStateData',
  userInput: 'userInput',
} as const;

/**
 * Base input schema for workflow-aware tools
 * All tools participating in workflow orchestration should extend this schema
 */
export const WORKFLOW_TOOL_BASE_INPUT_SCHEMA = z.object({
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.describe(
    'Workflow session state for continuation. Required for all workflow-aware tools, but optional for the orchestrator tool, because it can also start new workflows.'
  ),
});

/**
 * MCP tool invocation data structure used in LangGraph interrupts (Delegate Mode).
 *
 * When the orchestrator receives this data, it instructs the LLM to invoke a separate
 * MCP tool with the provided metadata and input.
 *
 * @template TInputSchema - The full workflow input schema (includes workflowStateData)
 */
export interface MCPToolInvocationData<TInputSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Input parameters - typed to business logic schema only (excludes workflowStateData) */
  input: Omit<z.infer<TInputSchema>, 'workflowStateData'>;
  /** Metadata about the tool to invoke, including the input schema for LLM context */
  llmMetadata: {
    name: string;
    description: string;
    /** Zod schema for input validation and LLM context */
    inputSchema: TInputSchema;
  };
}

/**
 * Node guidance data structure used in LangGraph interrupts (Direct Guidance Mode).
 *
 * When the orchestrator receives this data, it generates guidance directly inline
 * instead of delegating to a separate tool. This reduces latency by eliminating
 * an intermediate tool call.
 *
 * @template TResultSchema - The Zod schema for validating the result
 */
export interface NodeGuidanceData<TResultSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Unique identifier for this service/node - used for logging and debugging */
  nodeId: string;
  /** The task guidance/prompt that instructs the LLM what to do */
  taskGuidance: string;
  /** Zod schema defining expected output structure for result validation */
  resultSchema: TResultSchema;
  /**
   * Optional example output to help the LLM understand the expected response format.
   * When provided, this concrete example is shown alongside the schema to improve
   * LLM compliance with the expected structure.
   */
  exampleOutput?: string;
  /**
   * Optional custom guidance for the LLM to return results to the orchestrator.
   *
   * When provided, this replaces the orchestrator's default "return to orchestrator"
   * prompt. The function receives only `workflowStateData` (the runtime session state
   * that the producer doesn't have at construction time). The producer already owns
   * `resultSchema` and `exampleOutput` as sibling properties on this same struct,
   * so they can be captured in the closure if needed.
   *
   * Ensure this custom guidance properly instructs the LLM to return the workflow
   * to the orchestrator, or the workflow will likely be broken.
   *
   * @param workflowStateData - The workflow state data to round-trip back to the orchestrator
   * @returns The return guidance prompt string
   */
  returnGuidance?: (workflowStateData: WorkflowStateData) => string;
}

/**
 * Union type for all interrupt data types.
 * The orchestrator uses this to handle both delegate and direct guidance modes.
 *
 * @template TInputSchema - For MCPToolInvocationData: the full workflow input schema
 * @template TResultSchema - For NodeGuidanceData: the result validation schema
 */
export type InterruptData<
  TInputSchema extends z.ZodObject<z.ZodRawShape>,
  TResultSchema extends z.ZodObject<z.ZodRawShape>,
> = MCPToolInvocationData<TInputSchema> | NodeGuidanceData<TResultSchema>;

/**
 * Type guard to check if interrupt data is NodeGuidanceData (direct guidance mode).
 *
 * @param data - The interrupt data to check
 * @returns true if the data is NodeGuidanceData, false if it's MCPToolInvocationData
 */
export function isNodeGuidanceData<
  TInputSchema extends z.ZodObject<z.ZodRawShape>,
  TResultSchema extends z.ZodObject<z.ZodRawShape>,
>(data: InterruptData<TInputSchema, TResultSchema>): data is NodeGuidanceData<TResultSchema> {
  return 'taskGuidance' in data && 'resultSchema' in data && 'nodeId' in data;
}

/**
 * Standard output schema for all workflow MCP tools
 */
export const MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA = z.object({
  promptForLLM: z
    .string()
    .describe('Complete prompt with instructions and post-processing guidance'),
  resultSchema: z
    .string()
    .describe("The string-serialized JSON schema of the expected result from the LLM's task"),
});

export type MCPWorkflowToolOutput = z.infer<typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA>;

/**
 * Base tool metadata interface - defines the general structure for tool information
 */
export interface ToolMetadata<
  TInputSchema extends z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends z.ZodObject<z.ZodRawShape>,
> {
  /** Unique tool identifier used for MCP registration and workflow orchestration */
  readonly toolId: string;

  /** Extended tool title for detailed display */
  readonly title: string;

  /** Tool description for documentation and LLM context */
  readonly description: string;

  /** Zod input schema for validation */
  readonly inputSchema: TInputSchema;

  /** Zod output schema for validation */
  readonly outputSchema: TOutputSchema;
}

/**
 * Workflow tool metadata interface - defines the structure for workflow tool information
 */
export interface WorkflowToolMetadata<
  TInputSchema extends typeof WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  TResultSchema extends z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA =
    typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
> extends ToolMetadata<TInputSchema, TOutputSchema> {
  /** Holds the shape of the expected result for guidance-based tools */
  readonly resultSchema: TResultSchema;
}
