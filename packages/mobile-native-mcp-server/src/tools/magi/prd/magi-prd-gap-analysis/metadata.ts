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
import { GAP_SCHEMA } from '../shared/gapSchemas.js';

/**
 * Gap Analysis Tool Input Schema
 */
export const GAP_ANALYSIS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file'),
  requirementsPath: z
    .string()
    .describe('The path to the requirements file containing all requirements'),
});

export type GapAnalysisInput = z.infer<typeof GAP_ANALYSIS_INPUT_SCHEMA>;

export const GAP_ANALYSIS_RESULT_SCHEMA = z.object({
  gapAnalysisScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Overall gap analysis score (0-100, higher is better)'),
  identifiedGaps: z.array(GAP_SCHEMA).describe('Array of identified gaps'),
});

/**
 * Gap Analysis Tool Metadata
 */
export const GAP_ANALYSIS_TOOL: WorkflowToolMetadata<
  typeof GAP_ANALYSIS_INPUT_SCHEMA,
  typeof GAP_ANALYSIS_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-gap-analysis',
  title: 'Magi - Gap Analysis',
  description:
    'Analyzes current functional requirements against the feature brief to identify gaps, score requirement strengths, and provide improvement recommendations',
  inputSchema: GAP_ANALYSIS_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: GAP_ANALYSIS_RESULT_SCHEMA,
} as const;
