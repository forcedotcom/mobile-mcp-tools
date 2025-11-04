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
} from '../../../../common/metadata.js';
import { PRD_REVIEW_RESULT_SCHEMA } from '../shared/prdSchemas.js';

/**
 * PRD Update Tool Input Schema
 * This tool is specifically for updating PRD.md based on review feedback
 */
export const PRD_UPDATE_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  prdFilePath: z.string().describe('The path to the PRD.md file to update'),
  reviewResult: PRD_REVIEW_RESULT_SCHEMA.describe(
    'The output from the PRD review tool containing feedback and modifications'
  ),
});

export type PRDUpdateInput = z.infer<typeof PRD_UPDATE_INPUT_SCHEMA>;

export const PRD_UPDATE_RESULT_SCHEMA = z.object({
  updatedPrdContent: z
    .string()
    .describe('The updated PRD.md file content incorporating feedback and modifications'),
});

export type PRDUpdateResult = z.infer<typeof PRD_UPDATE_RESULT_SCHEMA>;

/**
 * PRD Update Tool Metadata
 */
export const PRD_UPDATE_TOOL: WorkflowToolMetadata<
  typeof PRD_UPDATE_INPUT_SCHEMA,
  typeof PRD_UPDATE_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-update',
  title: 'Magi - Update PRD',
  description:
    'Updates the PRD.md file based on review feedback. Applies modifications requested during the review process.',
  inputSchema: PRD_UPDATE_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PRD_UPDATE_RESULT_SCHEMA,
} as const;
