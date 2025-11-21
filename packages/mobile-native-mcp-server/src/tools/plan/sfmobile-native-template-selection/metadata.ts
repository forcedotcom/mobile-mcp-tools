/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM } from '../../../common/schemas.js';
import {
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Template Selection Tool Input Schema
 */
export const TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  platform: PLATFORM_ENUM,
  templateDetails: z
    .record(z.any())
    .describe('Detailed information for each template candidate from describetemplate command'),
});

export type TemplateSelectionWorkflowInput = z.infer<
  typeof TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA
>;

export const TEMPLATE_SELECTION_WORKFLOW_RESULT_SCHEMA = z.object({
  selectedTemplate: z.string().describe('The template path/name selected from the candidates'),
});

/**
 * Template Selection Tool Metadata
 */
export const TEMPLATE_SELECTION_TOOL: WorkflowToolMetadata<
  typeof TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA,
  typeof TEMPLATE_SELECTION_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-template-selection',
  title: 'Salesforce Mobile Native Template Selection',
  description: 'Guides LLM through final template selection from detailed template information',
  inputSchema: TEMPLATE_SELECTION_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: TEMPLATE_SELECTION_WORKFLOW_RESULT_SCHEMA,
} as const;
