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
 * Feature Brief Finalization Tool Input Schema
 */
export const FEATURE_BRIEF_FINALIZATION_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file to finalize'),
});

export type FeatureBriefFinalizationInput = z.infer<typeof FEATURE_BRIEF_FINALIZATION_INPUT_SCHEMA>;

export const FEATURE_BRIEF_FINALIZATION_RESULT_SCHEMA = z.object({
  finalizedFeatureBriefContent: z
    .string()
    .describe(
      'The finalized feature brief markdown content with status updated to "approved". Content should remain unchanged, only status section updated.'
    ),
});

/**
 * Feature Brief Finalization Tool Metadata
 */
export const FEATURE_BRIEF_FINALIZATION_TOOL: WorkflowToolMetadata<
  typeof FEATURE_BRIEF_FINALIZATION_INPUT_SCHEMA,
  typeof FEATURE_BRIEF_FINALIZATION_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-feature-brief-finalization',
  title: 'Magi - Finalize Feature Brief',
  description:
    'Finalizes the feature brief by updating the status to "approved" after user approval. Takes the path to the feature brief file and returns the updated content.',
  inputSchema: FEATURE_BRIEF_FINALIZATION_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FEATURE_BRIEF_FINALIZATION_RESULT_SCHEMA,
} as const;
