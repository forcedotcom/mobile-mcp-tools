/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PLATFORM_ENUM, PROJECT_PATH_FIELD } from '../../../common/schemas.js';

/**
 * Build Executor Tool Input Schema
 */
export const BUILD_EXECUTOR_INPUT_SCHEMA = z.object({
  platform: PLATFORM_ENUM,
  projectPath: PROJECT_PATH_FIELD,
});

export const BUILD_EXECUTOR_RESULT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the build was successful'),
  message: z.string().describe('Status message about the build'),
  output: z.string().optional().describe('Build output'),
  error: z.string().optional().describe('Error message if build failed'),
  buildOutputFilePath: z.string().optional().describe('Path to build output file if build failed'),
});

export type BuildExecutorInput = z.infer<typeof BUILD_EXECUTOR_INPUT_SCHEMA>;
export type BuildExecutorResult = z.infer<typeof BUILD_EXECUTOR_RESULT_SCHEMA>;

/**
 * Build Executor Tool Metadata
 */
export const BUILD_EXECUTOR_TOOL = {
  toolId: 'sfmobile-native-build-executor',
  title: 'Salesforce Mobile App Build Executor',
  description:
    'Executes the actual build process for iOS or Android projects with progress notifications',
  inputSchema: BUILD_EXECUTOR_INPUT_SCHEMA,
  resultSchema: BUILD_EXECUTOR_RESULT_SCHEMA,
} as const;
