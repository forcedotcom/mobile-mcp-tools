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
 * Requirements Finalization Tool Input Schema
 */
export const REQUIREMENTS_FINALIZATION_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  requirementsPath: z
    .string()
    .describe(
      'The path to the requirements file containing all requirements (approved, rejected, modified, pending review)'
    ),
});

export type RequirementsFinalizationInput = z.infer<typeof REQUIREMENTS_FINALIZATION_INPUT_SCHEMA>;

export const REQUIREMENTS_FINALIZATION_RESULT_SCHEMA = z.object({
  finalizedRequirementsContent: z
    .string()
    .describe(
      'The finalized requirements file content with status updated to "approved". All pending requirements should have been reviewed and moved to appropriate sections.'
    ),
});

/**
 * Requirements Finalization Tool Metadata
 */
export const REQUIREMENTS_FINALIZATION_TOOL: WorkflowToolMetadata<
  typeof REQUIREMENTS_FINALIZATION_INPUT_SCHEMA,
  typeof REQUIREMENTS_FINALIZATION_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-requirements-finalization',
  title: 'Magi - Finalize Requirements for PRD Generation',
  description:
    'Finalizes the requirements file by ensuring all requirements are reviewed and updating status to "approved" before proceeding to PRD generation.',
  inputSchema: REQUIREMENTS_FINALIZATION_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: REQUIREMENTS_FINALIZATION_RESULT_SCHEMA,
} as const;
