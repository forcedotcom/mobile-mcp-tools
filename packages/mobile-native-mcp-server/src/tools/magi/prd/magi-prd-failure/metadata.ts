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
 * PRD Failure Tool Input Schema
 */
export const PRD_FAILURE_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  messages: z
    .array(z.string())
    .describe('The messages describing PRD generation failures, to display to the user'),
});

export type PRDFailureWorkflowInput = z.infer<typeof PRD_FAILURE_WORKFLOW_INPUT_SCHEMA>;

export const PRD_FAILURE_WORKFLOW_RESULT_SCHEMA = z.object({});

/**
 * PRD Failure Tool Metadata
 */
export const PRD_FAILURE_TOOL: WorkflowToolMetadata<
  typeof PRD_FAILURE_WORKFLOW_INPUT_SCHEMA,
  typeof PRD_FAILURE_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-failure',
  title: 'MAGI PRD Generation - Workflow Failure',
  description: 'Describes a failure of the PRD generation workflow to the user',
  inputSchema: PRD_FAILURE_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PRD_FAILURE_WORKFLOW_RESULT_SCHEMA,
} as const;
