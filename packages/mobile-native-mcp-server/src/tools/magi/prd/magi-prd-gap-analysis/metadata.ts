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
 * Gap Analysis Tool Input Schema
 */
export const GAP_ANALYSIS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file'),
  requirementsPath: z
    .string()
    .describe('The path to the requirements.md file containing all requirements'),
});

export type GapAnalysisInput = z.infer<typeof GAP_ANALYSIS_INPUT_SCHEMA>;

export const GAP_ANALYSIS_RESULT_SCHEMA = z.object({
  gapAnalysisScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Overall gap analysis score (0-100, higher is better)'),
  identifiedGaps: z
    .array(
      z.object({
        id: z.string().describe('Unique identifier for the gap'),
        title: z.string().describe('Title of the identified gap'),
        description: z.string().describe('Detailed description of the gap'),
        severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Severity of the gap'),
        category: z
          .string()
          .describe('Category of the gap (e.g., UI/UX, Data, Security, Performance)'),
        impact: z.string().describe('Description of the impact if this gap is not addressed'),
        suggestedRequirements: z
          .array(
            z.object({
              title: z.string().describe('Suggested requirement title'),
              description: z.string().describe('Suggested requirement description'),
              priority: z.enum(['high', 'medium', 'low']).describe('Suggested priority'),
              category: z.string().describe('Suggested category'),
            })
          )
          .describe('Suggested requirements to address this gap'),
      })
    )
    .describe('Array of identified gaps'),
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
