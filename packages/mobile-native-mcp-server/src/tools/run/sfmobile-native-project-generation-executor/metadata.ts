/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM } from '../../../common/schemas.js';

/**
 * Project Generation Executor Tool Input Schema
 */
export const PROJECT_GENERATION_EXECUTOR_INPUT_SCHEMA = z.object({
  selectedTemplate: z.string().describe('The template ID selected from template discovery'),
  projectName: z.string().describe('Name for the mobile app project'),
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
});

export const PROJECT_GENERATION_EXECUTOR_RESULT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the project generation was successful'),
  message: z.string().describe('Status message about the project generation'),
  projectPath: z.string().optional().describe('Path to the generated project'),
  output: z.string().optional().describe('Command output'),
  error: z.string().optional().describe('Error message if generation failed'),
});

export type ProjectGenerationExecutorInput = z.infer<
  typeof PROJECT_GENERATION_EXECUTOR_INPUT_SCHEMA
>;
export type ProjectGenerationExecutorResult = z.infer<
  typeof PROJECT_GENERATION_EXECUTOR_RESULT_SCHEMA
>;

/**
 * Project Generation Executor Tool Metadata
 */
export const PROJECT_GENERATION_EXECUTOR_TOOL = {
  toolId: 'sfmobile-native-project-generation-executor',
  title: 'Salesforce Mobile Project Generation Executor',
  description:
    'Executes the actual project generation using sf mobilesdk CLI with progress notifications',
  inputSchema: PROJECT_GENERATION_EXECUTOR_INPUT_SCHEMA,
  resultSchema: PROJECT_GENERATION_EXECUTOR_RESULT_SCHEMA,
} as const;
