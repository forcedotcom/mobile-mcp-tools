/**
 * Centralized Tool Schema Definitions
 *
 * This module provides unified schema definitions for all MCP tools in the mobile native server.
 * These schemas are used both by the individual tools and by the workflow orchestration system
 * to ensure consistency and eliminate duplication.
 */

import { z } from 'zod';

/**
 * Common schema components used across multiple tools
 */

// Platform enum used across all mobile tools
export const PLATFORM_ENUM = z.enum(['iOS', 'Android']).describe('Target mobile platform');

// Project path field used in multiple tools
export const PROJECT_PATH_FIELD = z.string().describe('Path to the mobile project directory');

// Target device field for deployment tools
export const TARGET_DEVICE_FIELD = z
  .string()
  .optional()
  .describe('Target device identifier (optional)');

// Connected App fields for OAuth configuration
export const CONNECTED_APP_CLIENT_ID_FIELD = z
  .string()
  .describe('Connected App Client ID for OAuth configuration');
export const CONNECTED_APP_CALLBACK_URI_FIELD = z
  .string()
  .describe('Connected App Callback URI for OAuth configuration');
export const LOGIN_HOST_FIELD = z
  .string()
  .optional()
  .describe('Optional Salesforce login host URL (e.g., https://test.salesforce.com for sandbox)');

/**
 * Template Discovery Tool Schema
 */
export const TEMPLATE_DISCOVERY_INPUT_SCHEMA = z.object({
  platform: PLATFORM_ENUM,
});

export type TemplateDiscoveryInput = z.infer<typeof TEMPLATE_DISCOVERY_INPUT_SCHEMA>;

/**
 * Project Generation Tool Schema
 */
export const PROJECT_GENERATION_INPUT_SCHEMA = z.object({
  selectedTemplate: z.string().describe('The template ID selected from template discovery'),
  projectName: z.string().describe('Name for the mobile app project'),
  platform: PLATFORM_ENUM,
  packageName: z.string().describe('Package name for the mobile app (e.g., com.company.appname)'),
  organization: z.string().describe('Organization name for the mobile app project'),
  connectedAppClientId: CONNECTED_APP_CLIENT_ID_FIELD,
  connectedAppCallbackUri: CONNECTED_APP_CALLBACK_URI_FIELD,
  loginHost: LOGIN_HOST_FIELD,
});

export type ProjectGenerationInput = z.infer<typeof PROJECT_GENERATION_INPUT_SCHEMA>;

/**
 * Build Tool Schema
 */
export const BUILD_INPUT_SCHEMA = z.object({
  platform: PLATFORM_ENUM,
  projectPath: PROJECT_PATH_FIELD.describe('Path to the project'),
});

export type BuildInput = z.infer<typeof BUILD_INPUT_SCHEMA>;

// Build output schema
export const BUILD_OUTPUT_SCHEMA = z.object({});

export type BuildOutput = z.infer<typeof BUILD_OUTPUT_SCHEMA>;

/**
 * Deployment Tool Schema
 */
export const DEPLOYMENT_INPUT_SCHEMA = z.object({
  platform: PLATFORM_ENUM,
  projectPath: PROJECT_PATH_FIELD,
  buildType: z.enum(['debug', 'release']).default('debug').describe('Build type for deployment'),
  targetDevice: TARGET_DEVICE_FIELD,
});

export type DeploymentInput = z.infer<typeof DEPLOYMENT_INPUT_SCHEMA>;

/**
 * Xcode Add Files Tool Schema
 */
export const XCODE_ADD_FILES_INPUT_SCHEMA = z.object({
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

export type XcodeAddFilesInput = z.infer<typeof XCODE_ADD_FILES_INPUT_SCHEMA>;

export const XCODE_ADD_FILES_OUTPUT_SCHEMA = z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  command: z.string().describe('The Ruby command that was generated'),
  projectPath: z.string().describe('Absolute path to the Xcode project directory'),
  filePaths: z.array(z.string()).describe('Array of file paths that were processed'),
  targetName: z.string().optional().describe('Target name that files were added to'),
  message: z.string().describe('Human-readable status message'),
  error: z.string().optional().describe('Error message if operation failed'),
});

export type XcodeAddFilesOutput = z.infer<typeof XCODE_ADD_FILES_OUTPUT_SCHEMA>;

/**
 * Note: Tool metadata is now centralized in '../registry/toolRegistry.js'
 * This file focuses purely on schema definitions without duplication.
 */
