/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Schema for Salesforce org information
 */
export const ORG_INFO_SCHEMA = z.object({
  username: z.string().describe('The username of the Salesforce org'),
  alias: z.string().optional().describe('The alias of the Salesforce org'),
});

export type OrgInfoInput = z.infer<typeof ORG_INFO_SCHEMA>;

/**
 * Org Selection Tool Input Schema
 */
export const ORG_SELECTION_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  orgList: z
    .array(ORG_INFO_SCHEMA)
    .describe('The list of connected Salesforce orgs available for selection'),
});

export type OrgSelectionWorkflowInput = z.infer<typeof ORG_SELECTION_WORKFLOW_INPUT_SCHEMA>;

export const ORG_SELECTION_WORKFLOW_RESULT_SCHEMA = z.object({
  selectedOrgUsername: z
    .string()
    .describe('The username of the Salesforce org selected by the user'),
});

/**
 * Org Selection Tool Metadata
 */
export const ORG_SELECTION_TOOL: WorkflowToolMetadata<
  typeof ORG_SELECTION_WORKFLOW_INPUT_SCHEMA,
  typeof ORG_SELECTION_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-org-selection',
  title: 'Salesforce Mobile Native Org Selection',
  description: 'Guides user through selecting a Salesforce org from the available connected orgs',
  inputSchema: ORG_SELECTION_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: ORG_SELECTION_WORKFLOW_RESULT_SCHEMA,
} as const;
