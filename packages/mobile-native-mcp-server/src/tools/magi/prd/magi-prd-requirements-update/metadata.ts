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
import { REQUIREMENTS_REVIEW_RESULT_SCHEMA } from '../shared/requirementSchemas.js';

/**
 * Requirements Update Tool Input Schema
 * This tool is specifically for updating requirements.md based on review feedback
 */
export const REQUIREMENTS_UPDATE_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  requirementsPath: z.string().describe('The path to the requirements.md file to update'),
  reviewResult: REQUIREMENTS_REVIEW_RESULT_SCHEMA.describe(
    'The output from the requirements review tool containing feedback and decisions'
  ),
});

export type RequirementsUpdateInput = z.infer<typeof REQUIREMENTS_UPDATE_INPUT_SCHEMA>;

export const REQUIREMENTS_UPDATE_RESULT_SCHEMA = z.object({
  updatedRequirementsContent: z
    .string()
    .describe(
      'The updated requirements.md file content with review decisions applied (approved, rejected, modified requirements and review history)'
    ),
});

export type RequirementsUpdateResult = z.infer<typeof REQUIREMENTS_UPDATE_RESULT_SCHEMA>;

/**
 * Requirements Update Tool Metadata
 */
export const REQUIREMENTS_UPDATE_TOOL: WorkflowToolMetadata<
  typeof REQUIREMENTS_UPDATE_INPUT_SCHEMA,
  typeof REQUIREMENTS_UPDATE_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-requirements-update',
  title: 'Magi - Update Requirements',
  description:
    'Updates the requirements.md file based on review feedback. Applies approved, rejected, and modification decisions to the requirements document.',
  inputSchema: REQUIREMENTS_UPDATE_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: REQUIREMENTS_UPDATE_RESULT_SCHEMA,
} as const;
