/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  ToolMetadata,
  WORKFLOW_PROPERTY_NAMES,
  WORKFLOW_STATE_DATA_SCHEMA,
} from '../../common/metadata.js';
import type { OrchestratorConfig } from './config.js';

/**
 * Schema for the initial user request when starting a new workflow.
 * This is the expected format when calling the orchestrator for the first time.
 */
export const INITIAL_USER_REQUEST_SCHEMA = z.object({
  request: z.string().describe("The user's initial request to start the workflow"),
});

/**
 * Schema for resumption user input when continuing an existing workflow.
 * This allows any structured data returned from previous tool executions.
 */
export const RESUMPTION_USER_INPUT_SCHEMA = z
  .record(z.string(), z.unknown())
  .describe('Used for structured input generated from the results of previous tool calls.');

/**
 * Combined user input schema that accepts either:
 * - Initial request format: { request: "user's request string" } - for starting new workflows
 * - Resumption format: any object - for continuing workflows with tool results
 */
export const USER_INPUT_SCHEMA = z
  .union([INITIAL_USER_REQUEST_SCHEMA, RESUMPTION_USER_INPUT_SCHEMA])
  .describe(
    'User input - for initial calls use { request: "your request" }, for resumption calls use the structured output from the previous tool'
  );

/**
 * Orchestrator input schema
 *
 * Note: The workflow state data is optional/defaulted because the orchestrator
 * can start new workflows (where it doesn't exist yet) or continue existing ones.
 *
 * For initial calls (starting a new workflow):
 *   - userInput should be { request: "your request string" }
 *   - workflowStateData should be omitted or have empty thread_id
 *
 * For resumption calls (continuing an existing workflow):
 *   - userInput should contain the structured output from the previous tool execution
 *   - workflowStateData must contain the thread_id from the previous response
 */
export const ORCHESTRATOR_INPUT_SCHEMA = z.object({
  [WORKFLOW_PROPERTY_NAMES.userInput]: USER_INPUT_SCHEMA.optional(),
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.default({
    thread_id: '',
  }).describe('Opaque workflow state data. Do not populate unless explicitly instructed to do so.'),
});

export type OrchestratorInput = z.infer<typeof ORCHESTRATOR_INPUT_SCHEMA>;

/**
 * Orchestrator output schema - natural language orchestration prompt
 */
export const ORCHESTRATOR_OUTPUT_SCHEMA = z.object({
  orchestrationInstructionsPrompt: z
    .string()
    .describe('The prompt describing the next workflow action for the LLM to execute.'),
});

export type OrchestratorOutput = z.infer<typeof ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * Type alias for the default orchestrator input schema type.
 *
 * Used as the default generic parameter for OrchestratorConfig, OrchestratorToolMetadata,
 * and OrchestratorTool to avoid circular imports between config.ts and metadata.ts.
 */
export type DefaultOrchestratorInputSchema = typeof ORCHESTRATOR_INPUT_SCHEMA;

/**
 * Orchestrator tool metadata type
 * The metadata for the orchestrator tool (inputs/outputs)
 *
 * @template TInputSchema - The Zod input schema type. Defaults to ORCHESTRATOR_INPUT_SCHEMA.
 */
export type OrchestratorToolMetadata<
  TInputSchema extends z.ZodObject<z.ZodRawShape> = DefaultOrchestratorInputSchema,
> = ToolMetadata<TInputSchema, typeof ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * Factory function to create orchestrator tool metadata from configuration.
 * Takes the consumer-provided config and creates the tool metadata with
 * the appropriate input/output schemas.
 *
 * When a custom inputSchema is provided in the config, it is used instead of
 * the default ORCHESTRATOR_INPUT_SCHEMA.
 *
 * @template TInputSchema - The Zod input schema type. Defaults to ORCHESTRATOR_INPUT_SCHEMA.
 * @param config - The orchestrator configuration
 * @returns Tool metadata with the specified toolId, title, description, and schemas
 */
export function createOrchestratorToolMetadata<
  TInputSchema extends z.ZodObject<z.ZodRawShape> = DefaultOrchestratorInputSchema,
>(config: OrchestratorConfig<TInputSchema>): OrchestratorToolMetadata<TInputSchema> {
  // The cast is necessary because TypeScript cannot prove that when config.inputSchema
  // is undefined, TInputSchema must be DefaultOrchestratorInputSchema (i.e. the generic
  // default and the runtime default independently track the same fallback). The cast is
  // safe: when inputSchema is omitted, TInputSchema defaults to typeof ORCHESTRATOR_INPUT_SCHEMA.
  const effectiveInputSchema = (config.inputSchema ?? ORCHESTRATOR_INPUT_SCHEMA) as TInputSchema;
  return {
    toolId: config.toolId,
    title: config.title,
    description: config.description,
    inputSchema: effectiveInputSchema,
    outputSchema: ORCHESTRATOR_OUTPUT_SCHEMA,
  };
}
