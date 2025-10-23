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
 * Functional Requirements Tool Input Schema
 */
export const FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  projectPath: PROJECT_PATH_FIELD,
  featureBrief: z.string().describe('The feature brief generated from the previous step'),
  existingRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .optional()
    .describe('Existing functional requirements to build upon'),
  identifiedGaps: z
    .array(GAP_SCHEMA)
    .optional()
    .describe('Identified gaps that need to be addressed'),
  isGapBasedGeneration: z
    .boolean()
    .optional()
    .describe('Whether this is gap-based generation (true) or initial generation (false)'),
});

export type FunctionalRequirementsInput = z.infer<typeof FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA>;

export const FUNCTIONAL_REQUIREMENTS_RESULT_SCHEMA = z.object({
  functionalRequirements: z
    .array(FUNCTIONAL_REQUIREMENT_SCHEMA)
    .describe('Array of proposed functional requirements'),
  summary: z.string().describe('Summary of the proposed functional requirements'),
  generationType: z.enum(['initial', 'gap-based']).describe('Type of generation performed'),
  gapsAddressed: z
    .array(z.string())
    .optional()
    .describe('IDs of gaps that were addressed by the new requirements'),
});

/**
 * Functional Requirements Tool Metadata
 */
export const FUNCTIONAL_REQUIREMENTS_TOOL: WorkflowToolMetadata<
  typeof FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA,
  typeof FUNCTIONAL_REQUIREMENTS_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-functional-requirements',
  title: 'Salesforce Mobile Native App - Functional Requirements Generation',
  description:
    'Analyzes the feature brief and existing requirements/gaps to propose functional requirements for user approval',
  inputSchema: FUNCTIONAL_REQUIREMENTS_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FUNCTIONAL_REQUIREMENTS_RESULT_SCHEMA,
} as const;
