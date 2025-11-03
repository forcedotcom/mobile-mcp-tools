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

/**
 * Requirements Review Tool Input Schema
 */
export const REQUIREMENTS_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  requirementsContent: z
    .string()
    .describe(
      'The content of the requirements.md file containing all requirements (approved, rejected, modified, out-of-scope)'
    ),
});

export type RequirementsReviewInput = z.infer<typeof REQUIREMENTS_REVIEW_INPUT_SCHEMA>;

export const REQUIREMENTS_REVIEW_RESULT_SCHEMA = z.object({
  updatedRequirementsContent: z
    .string()
    .describe(
      'The updated requirements.md file content with review decisions incorporated (approved, rejected, modified requirements and review history)'
    ),
  reviewSummary: z
    .string()
    .describe('Summary of the review process and decisions made in this review session'),
});

/**
 * Requirements Review Tool Metadata
 */
export const REQUIREMENTS_REVIEW_TOOL: WorkflowToolMetadata<
  typeof REQUIREMENTS_REVIEW_INPUT_SCHEMA,
  typeof REQUIREMENTS_REVIEW_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-requirements-review',
  title: 'Magi - Requirements Review and Approval',
  description:
    'Reviews the requirements.md file with the user, facilitating approval, rejection, or modification of requirements. Returns updated requirements.md content.',
  inputSchema: REQUIREMENTS_REVIEW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: REQUIREMENTS_REVIEW_RESULT_SCHEMA,
} as const;
