/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PROJECT_PATH_FIELD } from '../../../common/schemas.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '@salesforce/magen-mcp-workflow';

/**
 * Finish Tool Input Schema
 */
export const FINISH_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  projectPath: PROJECT_PATH_FIELD,
});

export type FinishWorkflowInput = z.infer<typeof FINISH_WORKFLOW_INPUT_SCHEMA>;

export const FINISH_WORKFLOW_RESULT_SCHEMA = z.object({});

/**
 * Build Tool Metadata
 */
export const FINISH_TOOL: WorkflowToolMetadata<
  typeof FINISH_WORKFLOW_INPUT_SCHEMA,
  typeof FINISH_WORKFLOW_RESULT_SCHEMA
> = {
  toolId: 'sfmobile-native-completion',
  title: 'Salesforce Mobile Native App - Workflow Completion',
  description:
    'Guides LLM through the process of building a Salesforce mobile app with target platform',
  inputSchema: FINISH_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: FINISH_WORKFLOW_RESULT_SCHEMA,
} as const;
