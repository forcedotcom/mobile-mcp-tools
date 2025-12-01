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
 * Orchestrator input schema
 *
 * Note: The workflow state data is optional/defaulted because the orchestrator
 * can start new workflows (where it doesn't exist yet) or continue existing ones.
 */
export const ORCHESTRATOR_INPUT_SCHEMA = z.object({
  [WORKFLOW_PROPERTY_NAMES.userInput]: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'User input - can be any data structure from initial request or previously executed MCP tool'
    ),
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
 * Orchestrator tool metadata type
 * The metadata for the orchestrator tool (inputs/outputs)
 */
export type OrchestratorToolMetadata = ToolMetadata<
  typeof ORCHESTRATOR_INPUT_SCHEMA,
  typeof ORCHESTRATOR_OUTPUT_SCHEMA
>;

/**
 * Factory function to create orchestrator tool metadata from configuration
 * Takes the consumer-provided config and creates the tool metadata with
 * standardized input/output schemas.
 *
 * @param config - The orchestrator configuration
 * @returns Tool metadata with the specified toolId, title, description
 */
export function createOrchestratorToolMetadata(
  config: OrchestratorConfig
): OrchestratorToolMetadata {
  return {
    toolId: config.toolId,
    title: config.title,
    description: config.description,
    inputSchema: ORCHESTRATOR_INPUT_SCHEMA,
    outputSchema: ORCHESTRATOR_OUTPUT_SCHEMA,
  };
}
