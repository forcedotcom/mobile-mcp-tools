/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PROJECT_PATH_FIELD } from '../../../common/schemas.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '../../../common/metadata.js';

/**
 * Functional Requirement Schema
 */
export const FUNCTIONAL_REQUIREMENT_SCHEMA = z.object({
  id: z.string().describe('Unique identifier for the requirement'),
  title: z.string().describe('Short title of the functional requirement'),
  description: z.string().describe('Detailed description of the functional requirement'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level of the requirement'),
  category: z
    .string()
    .describe('Category of the requirement (e.g., UI/UX, Data, Security, Performance)'),
});

/**
 * Requirements Review Tool Input Schema
 */
export const REQUIREMENTS_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  projectPath: PROJECT_PATH_FIELD,
  functionalRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .describe('Array of functional requirements to review'),
});

export type RequirementsReviewInput = z.infer<typeof REQUIREMENTS_REVIEW_INPUT_SCHEMA>;

export const REQUIREMENTS_REVIEW_RESULT_SCHEMA = z.object({
  approvedRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .describe('Requirements approved by the user'),
  rejectedRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .describe('Requirements rejected by the user'),
  modifiedRequirements: z
    .array(
      FUNCTIONAL_REQUIREMENT_SCHEMA.extend({
        originalId: z.string().describe('ID of the original requirement that was modified'),
        modificationNotes: z.string().describe('Notes about what was modified'),
      })
    )
    .describe('Requirements that were modified by the user'),
  reviewSummary: z.string().describe('Summary of the review process and decisions made'),
  userFeedback: z.string().optional().describe('Additional feedback or comments from the user'),
});

/**
 * Requirements Review Tool Metadata
 */
export const REQUIREMENTS_REVIEW_TOOL: WorkflowToolMetadata<
  typeof REQUIREMENTS_REVIEW_INPUT_SCHEMA,
  typeof REQUIREMENTS_REVIEW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-requirements-review',
  title: 'Salesforce Mobile Native App - Requirements Review and Approval',
  description:
    'Presents functional requirements to the user for review, approval, rejection, or modification',
  inputSchema: REQUIREMENTS_REVIEW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: REQUIREMENTS_REVIEW_RESULT_SCHEMA,
} as const;
