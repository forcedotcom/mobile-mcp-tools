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
 * Initial Requirements Tool Input Schema
 */
export const INITIAL_REQUIREMENTS_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  featureBriefPath: z.string().describe('The path to the feature brief file to read'),
});

export type InitialRequirementsInput = z.infer<typeof INITIAL_REQUIREMENTS_INPUT_SCHEMA>;

export const INITIAL_REQUIREMENTS_RESULT_SCHEMA = z.object({
  requirementsMarkdown: z
    .string()
    .describe(
      'Complete requirements.md file content in markdown format, including Status section with "draft" status. Must follow the requirements.md structure with all requirements marked as pending review.'
    ),
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
