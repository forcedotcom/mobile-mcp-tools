/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM, PROJECT_NAME_FIELD } from '../../../common/schemas.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Project Generation Tool Input Schema
 */
export const PROJECT_GENERATION_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  selectedTemplate: z.string().describe('The template ID selected from template discovery'),
  projectName: PROJECT_NAME_FIELD,
  platform: PLATFORM_ENUM,
  packageName: z.string().describe('Package name for the mobile app (e.g., com.company.appname)'),
  organization: z.string().describe('Organization name for the mobile app project'),
  connectedAppClientId: z.string().describe('Connected App Client ID for OAuth configuration'),
  connectedAppCallbackUri: z
    .string()
    .describe('Connected App Callback URI for OAuth configuration'),
  loginHost: z
    .string()
    .optional()
    .describe('Optional Salesforce login host URL (e.g., https://test.salesforce.com for sandbox)'),
  templateProperties: z
    .record(z.string())
    .optional()
    .describe('Custom template-specific properties required by the selected template'),
});

export type ProjectGenerationWorkflowInput = z.infer<
  typeof PROJECT_GENERATION_WORKFLOW_INPUT_SCHEMA
>;

export const PROJECT_GENERATION_WORKFLOW_RESULT_SCHEMA = z.object({
  projectPath: z.string().describe('The path to the generated project'),
});

/**
 * Project Generation Tool Metadata
 */
export const PROJECT_GENERATION_TOOL: WorkflowToolMetadata<
  typeof PROJECT_GENERATION_WORKFLOW_INPUT_SCHEMA,
  typeof PROJECT_GENERATION_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-project-generation',
  title: 'Salesforce Mobile Native Project Generation',
  description:
    'Provides LLM instructions for generating a mobile app project from a selected template with OAuth configuration',
  inputSchema: PROJECT_GENERATION_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PROJECT_GENERATION_WORKFLOW_RESULT_SCHEMA,
} as const;
