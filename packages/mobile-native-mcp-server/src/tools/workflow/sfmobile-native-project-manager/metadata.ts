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
} from '@salesforce/magen-mcp-workflow';

/**
 * Orchestrator input schema
 *
 * Note: We handle the incorporation of the workflow state schema a little differently than
 * the other tools, as the orchestrator is the only tool where the workflow state may not
 * exist yet. All other tools require it as part of the workflow.
 */
export const ORCHESTRATOR_INPUT_SCHEMA = z.object({
  userInput: z
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
 * Orchestrator output schema - natural language orchestration prompt with completion status
 */
export const ORCHESTRATOR_OUTPUT_SCHEMA = z.object({
  orchestrationInstructionsPrompt: z
    .string()
    .describe('The prompt describing the next workflow action for the LLM to execute.'),
});

export type OrchestratorOutput = z.infer<typeof ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * Orchestrator Tool Metadata
 */
export const ORCHESTRATOR_TOOL: ToolMetadata<
  typeof ORCHESTRATOR_INPUT_SCHEMA,
  typeof ORCHESTRATOR_OUTPUT_SCHEMA
> = {
  toolId: 'sfmobile-native-project-manager',
  title: 'Salesforce Mobile Native Project Manager',
  description: 'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.',
  inputSchema: ORCHESTRATOR_INPUT_SCHEMA,
  outputSchema: ORCHESTRATOR_OUTPUT_SCHEMA,
} as const;
