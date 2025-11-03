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
 * Feature Brief Review Tool Input Schema
 */
export const FEATURE_BRIEF_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBrief: z.string().describe('The feature brief content (markdown text) to review'),
});

export type FeatureBriefReviewInput = z.infer<typeof FEATURE_BRIEF_REVIEW_INPUT_SCHEMA>;

/**
 * Modification Request Schema (optional)
 */
export const FEATURE_BRIEF_MODIFICATION_SCHEMA = z.object({
  section: z.string().describe('Section of the feature brief to modify'),
  modificationReason: z.string().describe('Reason for the modification request'),
  requestedContent: z.string().describe("The user's requested content changes"),
});

export const FEATURE_BRIEF_REVIEW_RESULT_SCHEMA = z.object({
  approved: z.boolean().describe('Whether the feature brief is approved by the user'),
  userFeedback: z.string().optional().describe('User feedback or comments on the feature brief'),
  reviewSummary: z.string().describe('Summary of the review process and decisions made'),
  modifications: z
    .array(FEATURE_BRIEF_MODIFICATION_SCHEMA)
    .optional()
    .describe('Requested modifications to the feature brief (if not approved)'),
  updatedFeatureBrief: z
    .string()
    .optional()
    .describe(
      'Updated feature brief markdown content with status section updated. Required when approved=true, must include status section with "approved" status.'
    ),
});

export type FeatureBriefReviewResult = z.infer<typeof FEATURE_BRIEF_REVIEW_RESULT_SCHEMA>;

/**
 * Feature Brief Review Tool Metadata
 */
export const FEATURE_BRIEF_REVIEW_TOOL: WorkflowToolMetadata<
  typeof FEATURE_BRIEF_REVIEW_INPUT_SCHEMA,
  typeof FEATURE_BRIEF_REVIEW_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-feature-brief-review',
  title: 'Magi - Feature Brief Review',
  description: 'Presents feature brief to the user for review, approval, or modification',
  inputSchema: FEATURE_BRIEF_REVIEW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FEATURE_BRIEF_REVIEW_RESULT_SCHEMA,
} as const;
