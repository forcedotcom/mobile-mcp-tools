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
 * Xcode Add Files Tool Input Schema
 */
export const XCODE_ADD_FILES_WORKFLOW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  projectPath: z.string().describe('Absolute path to the Xcode project directory'),
  xcodeProjectPath: z.string().describe('Path to the .xcodeproj file (e.g., "MyApp.xcodeproj")'),
  newFilePaths: z
    .array(z.string())
    .describe('Array of newly created file paths relative to project root'),
  targetName: z
    .string()
    .optional()
    .describe('Optional: specific target to add files to (defaults to main app target)'),
});

export type XcodeAddFilesWorkflowInput = z.infer<typeof XCODE_ADD_FILES_WORKFLOW_INPUT_SCHEMA>;

/**
 * Xcode Add Files Tool Output Schema
 */
export const XCODE_ADD_FILES_RESULT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  command: z.string().describe('The Ruby command that was generated'),
  projectPath: z.string().describe('Absolute path to the Xcode project directory'),
  filePaths: z.array(z.string()).describe('Array of file paths that were processed'),
  targetName: z.string().optional().describe('Target name that files were added to'),
  message: z.string().describe('Human-readable status message'),
  error: z.string().optional().describe('Error message if operation failed'),
});

/**
 * Xcode Add Files Utility Tool Metadata
 */
export const XCODE_ADD_FILES_TOOL: WorkflowToolMetadata<
  typeof XCODE_ADD_FILES_WORKFLOW_INPUT_SCHEMA,
  typeof XCODE_ADD_FILES_RESULT_SCHEMA
> = {
  toolId: 'utils-xcode-add-files',
  title: 'Xcode Project File Addition Utility',
  description: 'Generates a Ruby command using the xcodeproj gem to add files to Xcode projects',
  inputSchema: XCODE_ADD_FILES_WORKFLOW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: XCODE_ADD_FILES_RESULT_SCHEMA,
} as const;
