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
 * Schema for a functional requirement
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
 * Initial Requirements Tool Input Schema
 */
export const INITIAL_REQUIREMENTS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBrief: z.string().describe('The feature brief generated from the previous step'),
});

export type InitialRequirementsInput = z.infer<typeof INITIAL_REQUIREMENTS_INPUT_SCHEMA>;

export const INITIAL_REQUIREMENTS_RESULT_SCHEMA = z.object({
  functionalRequirements: z.array(FUNCTIONAL_REQUIREMENT_SCHEMA),
  summary: z.string().describe('Brief summary of the proposed requirements'),
});

/**
 * Initial Requirements Tool Metadata
 */
export const INITIAL_REQUIREMENTS_TOOL: WorkflowToolMetadata<
  typeof INITIAL_REQUIREMENTS_INPUT_SCHEMA,
  typeof INITIAL_REQUIREMENTS_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-initial-requirements',
  title: 'Magi - Generate Initial Requirements from Feature Brief',
  description: 'Analyzes the feature brief to propose initial functional requirements',
  inputSchema: INITIAL_REQUIREMENTS_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: INITIAL_REQUIREMENTS_RESULT_SCHEMA,
} as const;
