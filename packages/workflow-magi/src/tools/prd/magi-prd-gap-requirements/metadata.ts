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
} from '@salesforce/magen-mcp-workflow';
import { GAP_SCHEMA } from '../shared/gapSchemas.js';

/**
 * Gap Requirements Tool Input Schema
 */
export const GAP_REQUIREMENTS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file'),
  requirementsPath: z
    .string()
    .describe('The path to the requirements file containing all requirements'),
  identifiedGaps: z.array(GAP_SCHEMA).describe('Identified gaps that need to be addressed'),
});

export type GapRequirementsInput = z.infer<typeof GAP_REQUIREMENTS_INPUT_SCHEMA>;

export const GAP_REQUIREMENTS_RESULT_SCHEMA = z.object({
  updatedRequirementsMarkdown: z
    .string()
    .describe(
      'Complete updated requirements file content in markdown format. This should include all existing requirements plus the new requirements appended to the "Pending Review Requirements" section. Status should remain "draft".'
    ),
});

/**
 * Gap Requirements Tool Metadata
 */
export const GAP_REQUIREMENTS_TOOL: WorkflowToolMetadata<
  typeof GAP_REQUIREMENTS_INPUT_SCHEMA,
  typeof GAP_REQUIREMENTS_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-gap-requirements',
  title: 'Magi - Generate Requirements from Identified Gaps',
  description:
    'Analyzes identified gaps to propose additional functional requirements that address the gaps',
  inputSchema: GAP_REQUIREMENTS_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: GAP_REQUIREMENTS_RESULT_SCHEMA,
} as const;
