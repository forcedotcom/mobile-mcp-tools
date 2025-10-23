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
 * Gap Analysis Tool Input Schema
 */
export const GAP_ANALYSIS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  projectPath: PROJECT_PATH_FIELD,
  featureBrief: z.string().describe('The original feature brief'),
  functionalRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .describe('Current functional requirements to analyze'),
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
  requirementStrengths: z
    .array(
      z.object({
        requirementId: z.string().describe('ID of the requirement being analyzed'),
        strengthScore: z
          .number()
          .min(0)
          .max(10)
          .describe('Strength score for this requirement (0-10)'),
        strengths: z
          .array(z.string())
          .describe('List of strengths identified for this requirement'),
        weaknesses: z.array(z.string()).describe('List of weaknesses or areas for improvement'),
      })
    )
    .describe('Analysis of individual requirement strengths'),
  overallAssessment: z
    .object({
      coverageScore: z
        .number()
        .min(0)
        .max(100)
        .describe('How well the requirements cover the feature brief (0-100)'),
      completenessScore: z
        .number()
        .min(0)
        .max(100)
        .describe('Completeness of the requirements (0-100)'),
      clarityScore: z
        .number()
        .min(0)
        .max(100)
        .describe('Clarity and specificity of the requirements (0-100)'),
      feasibilityScore: z
        .number()
        .min(0)
        .max(100)
        .describe('Feasibility of implementing the requirements (0-100)'),
    })
    .describe('Overall assessment scores'),
  recommendations: z
    .array(z.string())
    .describe('High-level recommendations for improving the requirements'),
  summary: z.string().describe('Summary of the gap analysis findings'),
});

/**
 * Gap Analysis Tool Metadata
 */
export const GAP_ANALYSIS_TOOL: WorkflowToolMetadata<
  typeof GAP_ANALYSIS_INPUT_SCHEMA,
  typeof GAP_ANALYSIS_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-gap-analysis',
  title: 'Salesforce Mobile Native App - Requirements Gap Analysis',
  description:
    'Analyzes current functional requirements against the feature brief to identify gaps, score requirement strengths, and provide improvement recommendations',
  inputSchema: GAP_ANALYSIS_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: GAP_ANALYSIS_RESULT_SCHEMA,
} as const;
