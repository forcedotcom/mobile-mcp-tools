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
 * Gap Schema
 */
export const GAP_SCHEMA = z.object({
  id: z.string().describe('Unique identifier for the gap'),
  title: z.string().describe('Title of the identified gap'),
  description: z.string().describe('Detailed description of the gap'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Severity of the gap'),
  category: z.string().describe('Category of the gap'),
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
});

/**
 * Gap-Based Functional Requirements Tool Input Schema
 *
 * Note: This tool is specifically for gap-based requirements generation.
 * For initial requirements generation, use magi-prd-initial-requirements instead.
 */
export const GAP_BASED_FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA =
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
    featureBrief: z.string().describe('The feature brief generated from the previous step'),
    requirementsContent: z
      .string()
      .optional()
      .describe('The existing requirements content to build upon'),
    identifiedGaps: z
      .array(GAP_SCHEMA)
      .describe('Identified gaps that need to be addressed (required for gap-based generation)'),
  });

export type GapBasedFunctionalRequirementsInput = z.infer<
  typeof GAP_BASED_FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA
>;

export const GAP_BASED_FUNCTIONAL_REQUIREMENTS_RESULT_SCHEMA = z.object({
  functionalRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .describe('Array of proposed functional requirements'),
  summary: z.string().describe('Summary of the proposed functional requirements'),
  gapsAddressed: z
    .array(z.string())
    .describe('IDs of gaps that were addressed by the new requirements'),
});

/**
 * Gap-Based Functional Requirements Tool Metadata
 */
export const GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL: WorkflowToolMetadata<
  typeof GAP_BASED_FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA,
  typeof GAP_BASED_FUNCTIONAL_REQUIREMENTS_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-gap-based-functional-requirements',
  title: 'Magi - Gap-Based Functional Requirements Generation',
  description:
    'Generates functional requirements based on identified gaps. For initial requirements generation, use magi-prd-initial-requirements instead.',
  inputSchema: GAP_BASED_FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: GAP_BASED_FUNCTIONAL_REQUIREMENTS_RESULT_SCHEMA,
} as const;
