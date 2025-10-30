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
 * Modification Request Schema (for iteration scenarios)
 */
export const FEATURE_BRIEF_MODIFICATION_SCHEMA = z.object({
  section: z.string().describe('Section of the feature brief to modify'),
  modificationReason: z.string().describe('Reason for the modification request'),
  requestedContent: z.string().describe("The user's requested content changes"),
});

/**
 * Feature Brief Update Tool Input Schema
 * This tool is specifically for updating/iterating on an existing feature brief
 */
export const FEATURE_BRIEF_UPDATE_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  existingFeatureId: z.string().describe('The existing feature ID to update (must be reused)'),
  featureBrief: z.string().describe('The existing feature brief content (markdown text) to update'),
  userUtterance: z.unknown().describe('The original user utterance (for context when updating)'),
  userFeedback: z
    .string()
    .optional()
    .describe('User feedback from the review process explaining what needs to change'),
  modifications: z
    .array(FEATURE_BRIEF_MODIFICATION_SCHEMA)
    .optional()
    .describe('Specific requested modifications from the review process'),
});

export type FeatureBriefUpdateInput = z.infer<typeof FEATURE_BRIEF_UPDATE_INPUT_SCHEMA>;

export const FEATURE_BRIEF_UPDATE_RESULT_SCHEMA = z.object({
  featureBriefMarkdown: z
    .string()
    .describe('The updated feature brief Markdown content incorporating feedback'),
  // Note: featureId is not in the result because it MUST match the existingFeatureId from input
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
    'Updates an existing feature brief based on user feedback and modification requests from the review process',
  inputSchema: FEATURE_BRIEF_UPDATE_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FEATURE_BRIEF_UPDATE_RESULT_SCHEMA,
} as const;
