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

/**
 * Failure Tool Input Schema
 */
export const FAILURE_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  messages: z
    .array(z.string())
    .describe('The messages describing failures, to display to the user'),
});

export type FailureWorkflowInput = z.infer<typeof FAILURE_WORKFLOW_INPUT_SCHEMA>;

export const FAILURE_WORKFLOW_RESULT_SCHEMA = z.object({});

/**
 * Failure Tool Metadata
 */
export const FAILURE_TOOL: WorkflowToolMetadata<
  typeof FAILURE_WORKFLOW_INPUT_SCHEMA,
  typeof FAILURE_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-failure',
  title: 'Salesforce Mobile Native App - Workflow Failure',
  description: 'Describes a failure of the workflow to the user',
  inputSchema: FAILURE_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FAILURE_WORKFLOW_RESULT_SCHEMA,
} as const;
