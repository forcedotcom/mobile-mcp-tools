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
 * Template Discovery Tool Input Schema
 */
export const TEMPLATE_DISCOVERY_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  platform: PLATFORM_ENUM,
});

export type TemplateDiscoveryWorkflowInput = z.infer<
  typeof TEMPLATE_DISCOVERY_WORKFLOW_INPUT_SCHEMA
>;

export const TEMPLATE_DISCOVERY_WORKFLOW_RESULT_SCHEMA = z.object({
  selectedTemplate: z.string().describe('The template name selected from template discovery'),
  templatePropertiesMetadata: z
    .record(
      z.object({
        value: z.string().optional(),
        required: z.boolean(),
        description: z.string(),
      })
    )
    .optional()
    .describe('Metadata for custom template properties that need to be collected from the user'),
});

/**
 * Template Discovery Tool Metadata
 */
export const TEMPLATE_DISCOVERY_TOOL: WorkflowToolMetadata<
  typeof TEMPLATE_DISCOVERY_WORKFLOW_INPUT_SCHEMA,
  typeof TEMPLATE_DISCOVERY_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-template-discovery',
  title: 'Salesforce Mobile Native Template Discovery',
  description:
    'Guides LLM through template discovery and selection for Salesforce mobile app development',
  inputSchema: TEMPLATE_DISCOVERY_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: TEMPLATE_DISCOVERY_WORKFLOW_RESULT_SCHEMA,
} as const;
