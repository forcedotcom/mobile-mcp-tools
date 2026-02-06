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
 * Schema for Connected App information
 */
export const CONNECTED_APP_INFO_SCHEMA = z.object({
  fullName: z.string().describe('The API name of the Connected App'),
  createdByName: z.string().describe('The name of the user who created the Connected App'),
});

export type ConnectedAppInfoInput = z.infer<typeof CONNECTED_APP_INFO_SCHEMA>;

/**
 * Connected App Selection Tool Input Schema
 */
export const CONNECTED_APP_SELECTION_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend(
  {
    connectedAppList: z
      .array(CONNECTED_APP_INFO_SCHEMA)
      .describe('The list of Connected Apps available in the Salesforce org'),
  }
);

export type ConnectedAppSelectionWorkflowInput = z.infer<
  typeof CONNECTED_APP_SELECTION_WORKFLOW_INPUT_SCHEMA
>;

export const CONNECTED_APP_SELECTION_WORKFLOW_RESULT_SCHEMA = z.object({
  selectedConnectedAppName: z
    .string()
    .describe('The fullName of the Connected App selected by the user'),
});

/**
 * Connected App Selection Tool Metadata
 */
export const CONNECTED_APP_SELECTION_TOOL: WorkflowToolMetadata<
  typeof CONNECTED_APP_SELECTION_WORKFLOW_INPUT_SCHEMA,
  typeof CONNECTED_APP_SELECTION_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-connected-app-selection',
  title: 'Salesforce Mobile Native Connected App Selection',
  description:
    'Guides user through selecting a Connected App from the available options in their Salesforce org',
  inputSchema: CONNECTED_APP_SELECTION_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: CONNECTED_APP_SELECTION_WORKFLOW_RESULT_SCHEMA,
} as const;
