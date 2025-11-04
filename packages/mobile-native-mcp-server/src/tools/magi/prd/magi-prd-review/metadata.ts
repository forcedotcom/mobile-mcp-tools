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
 * PRD Review Tool Input Schema
 */
export const PRD_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  prdFilePath: z.string().describe('The file path where the PRD is located'),
});

export type PRDReviewInput = z.infer<typeof PRD_REVIEW_INPUT_SCHEMA>;

export type PRDReviewResult = z.infer<typeof PRD_REVIEW_RESULT_SCHEMA>;

/**
 * PRD Review Tool Metadata
 */
export const PRD_REVIEW_TOOL: WorkflowToolMetadata<
  typeof PRD_REVIEW_INPUT_SCHEMA,
  typeof PRD_REVIEW_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-review',
  title: 'Magi - PRD Review',
  description: 'Presents the generated PRD to the user for review, approval, or modification',
  inputSchema: PRD_REVIEW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PRD_REVIEW_RESULT_SCHEMA,
} as const;
