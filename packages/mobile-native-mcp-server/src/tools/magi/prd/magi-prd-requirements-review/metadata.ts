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
import { REQUIREMENTS_REVIEW_RESULT_SCHEMA } from '../shared/requirementSchemas.js';

/**
 * Requirements Review Tool Input Schema
 */
export const REQUIREMENTS_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  requirementsPath: z.string().describe('The path to the requirements.md file to review'),
});

export type RequirementsReviewInput = z.infer<typeof REQUIREMENTS_REVIEW_INPUT_SCHEMA>;

// Re-export the type for convenience
export type RequirementsReviewResult = z.infer<typeof REQUIREMENTS_REVIEW_RESULT_SCHEMA>;

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
    'Reviews the requirements.md file with the user, facilitating approval, rejection, or modification of requirements. Returns review feedback including approved/rejected IDs and modification requests.',
  inputSchema: REQUIREMENTS_REVIEW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: REQUIREMENTS_REVIEW_RESULT_SCHEMA,
} as const;
