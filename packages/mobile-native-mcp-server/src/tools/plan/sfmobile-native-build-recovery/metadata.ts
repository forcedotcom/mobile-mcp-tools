/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM, PROJECT_NAME_FIELD, PROJECT_PATH_FIELD } from '../../../common/schemas.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Build Recovery Tool Input Schema
 */
export const BUILD_RECOVERY_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  platform: PLATFORM_ENUM,
  projectPath: PROJECT_PATH_FIELD,
  projectName: PROJECT_NAME_FIELD,
  buildOutputFilePath: z.string().describe('Path to the failed build output file'),
  attemptNumber: z.number().describe('Current build attempt number'),
});

export const BUILD_RECOVERY_WORKFLOW_RESULT_SCHEMA = z.object({
  fixesAttempted: z.array(z.string()).describe('List of fixes that were attempted'),
  readyForRetry: z.boolean().describe('Whether fixes were applied and build should be retried'),
});

export type BuildRecoveryWorkflowInput = z.infer<typeof BUILD_RECOVERY_WORKFLOW_INPUT_SCHEMA>;

/**
 * Build Recovery Tool Metadata
 */
export const BUILD_RECOVERY_TOOL: WorkflowToolMetadata<
  typeof BUILD_RECOVERY_WORKFLOW_INPUT_SCHEMA,
  typeof BUILD_RECOVERY_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-build-recovery',
  title: 'Salesforce Mobile App Build Recovery Tool',
  description:
    'Analyzes build failures and attempts to fix common issues in Salesforce mobile app projects',
  inputSchema: BUILD_RECOVERY_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: BUILD_RECOVERY_WORKFLOW_RESULT_SCHEMA,
} as const;
