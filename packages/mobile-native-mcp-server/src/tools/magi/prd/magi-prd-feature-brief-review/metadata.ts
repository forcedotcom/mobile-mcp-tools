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
import { FEATURE_BRIEF_REVIEW_RESULT_SCHEMA } from '../shared/featureBriefSchemas.js';

/**
 * Feature Brief Review Tool Input Schema
 */
export const FEATURE_BRIEF_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file to review'),
});

export type FeatureBriefReviewInput = z.infer<typeof FEATURE_BRIEF_REVIEW_INPUT_SCHEMA>;

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
