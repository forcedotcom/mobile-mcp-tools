/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * PRD Finalization Tool Input Schema
 */
export const PRD_FINALIZATION_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  prdFilePath: z.string().describe('The path to the PRD file to finalize'),
});

export type PRDFinalizationInput = z.infer<typeof PRD_FINALIZATION_INPUT_SCHEMA>;

export const PRD_FINALIZATION_RESULT_SCHEMA = z.object({
  finalizedPrdContent: z
    .string()
    .describe(
      'The finalized PRD markdown content with status updated to "finalized". Content should remain unchanged, only status section updated.'
    ),
});

/**
 * PRD Finalization Tool Metadata
 */
export const PRD_FINALIZATION_TOOL: WorkflowToolMetadata<
  typeof PRD_FINALIZATION_INPUT_SCHEMA,
  typeof PRD_FINALIZATION_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-finalization',
  title: 'Magi - Finalize PRD',
  description:
    'Finalizes the PRD by updating the status to "finalized" after user approval. Takes the path to the PRD file and returns the updated content.',
  inputSchema: PRD_FINALIZATION_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PRD_FINALIZATION_RESULT_SCHEMA,
} as const;
