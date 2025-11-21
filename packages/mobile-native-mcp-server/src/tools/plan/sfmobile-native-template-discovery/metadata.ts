/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM, TEMPLATE_LIST_SCHEMA } from '../../../common/schemas.js';
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
  templateOptions: TEMPLATE_LIST_SCHEMA.describe(
    'The template options. Must include templates array with each template having a path field.'
  ),
});

export type TemplateDiscoveryWorkflowInput = z.infer<
  typeof TEMPLATE_DISCOVERY_WORKFLOW_INPUT_SCHEMA
>;

/**
 * Template Discovery Tool Result Schema
 * Note: templateCandidates should contain template paths that exist in templateOptions.templates[].path
 * This validation is enforced in the tool execution logic, not in the schema.
 */
export const TEMPLATE_DISCOVERY_WORKFLOW_RESULT_SCHEMA = z.object({
  templateCandidates: z
    .array(z.string())
    .min(1)
    .describe(
      'List of template paths/names that are promising candidates for further investigation. Each candidate must match a template path from templateOptions.templates[].path'
    ),
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
