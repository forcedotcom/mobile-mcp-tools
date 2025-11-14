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
 * PRD Orchestrator input schema
 *
 * Note: We handle the incorporation of the workflow state schema a little differently than
 * the main orchestrator to avoid circular dependencies.
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

export type PRDOrchestratorInput = z.infer<typeof ORCHESTRATOR_INPUT_SCHEMA>;

/**
 * PRD Orchestrator output schema
 */
export const ORCHESTRATOR_OUTPUT_SCHEMA = z.object({
  orchestrationInstructionsPrompt: z
    .string()
    .describe('The prompt describing the next PRD workflow action for the LLM to execute.'),
});

export type PRDOrchestratorOutput = z.infer<typeof ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * PRD Orchestrator Tool Metadata
 */
export const PRD_ORCHESTRATOR_TOOL: ToolMetadata<
  typeof ORCHESTRATOR_INPUT_SCHEMA,
  typeof ORCHESTRATOR_OUTPUT_SCHEMA
> = {
  toolId: 'magi-prd-orchestrator',
  title: 'Magi - PRD Orchestrator',
  description:
    'Orchestrates the end-to-end workflow for generating Product Requirements Documents.',
  inputSchema: ORCHESTRATOR_INPUT_SCHEMA,
  outputSchema: ORCHESTRATOR_OUTPUT_SCHEMA,
} as const;
