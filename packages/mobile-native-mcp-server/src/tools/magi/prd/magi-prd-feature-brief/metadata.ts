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
 * Finish Tool Input Schema
 */
export const FEATURE_BRIEF_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  userUtterance: z.unknown().describe('The user utterance request for a feature brief'),
});

export type FeatureBriefWorkflowInput = z.infer<typeof FEATURE_BRIEF_WORKFLOW_INPUT_SCHEMA>;

export const FEATURE_BRIEF_WORKFLOW_RESULT_SCHEMA = z.object({
  featureBriefMarkdown: z
    .string()
    .describe('The feature brief Markdown content generated from the user utterance'),
});

/**
 * Build Tool Metadata
 */
export const FEATURE_BRIEF_TOOL: WorkflowToolMetadata<
  typeof FEATURE_BRIEF_WORKFLOW_INPUT_SCHEMA,
  typeof FEATURE_BRIEF_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-feature-brief',
  title: 'Magi - Generate Feature Brief',
  description: 'Guides LLM through the process creating a feature brief from a user utterance',
  inputSchema: FEATURE_BRIEF_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FEATURE_BRIEF_WORKFLOW_RESULT_SCHEMA,
} as const;
