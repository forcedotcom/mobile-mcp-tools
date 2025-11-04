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
import { FEATURE_BRIEF_REVIEW_RESULT_SCHEMA } from '../magi-prd-feature-brief-review/metadata.js';

/**
 * Feature Brief Update Tool Input Schema
 * This tool is specifically for updating/iterating on an existing feature brief based on user feedback
 */
export const FEATURE_BRIEF_UPDATE_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file to update'),
  reviewResult: FEATURE_BRIEF_REVIEW_RESULT_SCHEMA.describe(
    'The output from the feature brief review tool containing feedback and modifications'
  ),
});

export type FeatureBriefUpdateInput = z.infer<typeof FEATURE_BRIEF_UPDATE_INPUT_SCHEMA>;

export const FEATURE_BRIEF_UPDATE_RESULT_SCHEMA = z.object({
  featureBriefMarkdown: z
    .string()
    .describe('The updated feature brief Markdown content incorporating feedback'),
});

export type FeatureBriefUpdateResult = z.infer<typeof FEATURE_BRIEF_UPDATE_RESULT_SCHEMA>;

/**
 * Feature Brief Update Tool Metadata
 */
export const FEATURE_BRIEF_UPDATE_TOOL: WorkflowToolMetadata<
  typeof FEATURE_BRIEF_UPDATE_INPUT_SCHEMA,
  typeof FEATURE_BRIEF_UPDATE_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-feature-brief-update',
  title: 'Magi - Update Feature Brief',
  description:
    'Updates an existing feature brief based on user feedback and modification requests. This tool is ONLY used when modifications are requested (not for approvals).',
  inputSchema: FEATURE_BRIEF_UPDATE_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FEATURE_BRIEF_UPDATE_RESULT_SCHEMA,
} as const;
