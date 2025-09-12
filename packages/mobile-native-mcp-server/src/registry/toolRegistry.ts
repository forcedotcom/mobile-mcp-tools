/**
 * Centralized Tool Registry
 *
 * This module provides a single source of truth for all tool metadata in the mobile native MCP server.
 * It eliminates duplication between tool implementations, schema definitions, and workflow orchestration.
 */

import { ZodObject, ZodRawShape } from 'zod';
import {
  TEMPLATE_DISCOVERY_INPUT_SCHEMA,
  PROJECT_GENERATION_INPUT_SCHEMA,
  BUILD_INPUT_SCHEMA,
  DEPLOYMENT_INPUT_SCHEMA,
  XCODE_ADD_FILES_INPUT_SCHEMA,
} from '../schemas/toolSchemas.js';
import { ORCHESTRATOR_INPUT_SCHEMA } from '../workflow/schemas.js';

/**
 * Tool metadata interface - defines the structure for tool information
 */
export interface ToolMetadata<TInputSchema extends ZodRawShape = ZodRawShape> {
  /** Unique tool identifier used for MCP registration and workflow orchestration */
  readonly toolId: string;

  /** Human-readable tool name for display */
  readonly name: string;

  /** Extended tool title for detailed display */
  readonly title: string;

  /** Tool description for documentation and LLM context */
  readonly description: string;

  /** Zod input schema for validation */
  readonly inputSchema: ZodObject<TInputSchema>;
}

/**
 * Template Discovery Tool Metadata
 */
export const TEMPLATE_DISCOVERY_TOOL: ToolMetadata<typeof TEMPLATE_DISCOVERY_INPUT_SCHEMA.shape> = {
  toolId: 'sfmobile-native-template-discovery',
  name: 'Salesforce Mobile Native Template Discovery',
  title: 'Salesforce Mobile Native Template Discovery Guide',
  description:
    'Guides LLM through template discovery and selection for Salesforce mobile app development',
  inputSchema: TEMPLATE_DISCOVERY_INPUT_SCHEMA,
} as const;

/**
 * Project Generation Tool Metadata
 */
export const PROJECT_GENERATION_TOOL: ToolMetadata<typeof PROJECT_GENERATION_INPUT_SCHEMA.shape> = {
  toolId: 'sfmobile-native-project-generation',
  name: 'Salesforce Mobile Native Project Generation',
  title: 'Salesforce Mobile Native Project Generation Guide',
  description:
    'Provides LLM instructions for generating a mobile app project from a selected template with OAuth configuration',
  inputSchema: PROJECT_GENERATION_INPUT_SCHEMA,
} as const;

/**
 * Build Tool Metadata
 */
export const BUILD_TOOL: ToolMetadata<typeof BUILD_INPUT_SCHEMA.shape> = {
  toolId: 'sfmobile-native-build',
  name: 'Salesforce Mobile App Build Tool',
  title: 'Salesforce Mobile app build guide',
  description:
    'Guides LLM through the process of building a Salesforce mobile app with target platform',
  inputSchema: BUILD_INPUT_SCHEMA,
} as const;

/**
 * Deployment Tool Metadata
 */
export const DEPLOYMENT_TOOL: ToolMetadata<typeof DEPLOYMENT_INPUT_SCHEMA.shape> = {
  toolId: 'sfmobile-native-deployment',
  name: 'Salesforce Mobile Native Deployment',
  title: 'Salesforce Mobile Native Deployment Guide',
  description:
    'Guides LLM through deploying Salesforce mobile native apps to devices or simulators',
  inputSchema: DEPLOYMENT_INPUT_SCHEMA,
} as const;

/**
 * Xcode Add Files Utility Tool Metadata
 */
export const XCODE_ADD_FILES_TOOL: ToolMetadata<typeof XCODE_ADD_FILES_INPUT_SCHEMA.shape> = {
  toolId: 'utils-xcode-add-files',
  name: 'Utils Xcode Add Files',
  title: 'Xcode Project File Addition Utility',
  description: 'Generates a Ruby command using the xcodeproj gem to add files to Xcode projects',
  inputSchema: XCODE_ADD_FILES_INPUT_SCHEMA,
} as const;

/**
 * Orchestrator Tool Metadata
 */
export const ORCHESTRATOR_TOOL: ToolMetadata<typeof ORCHESTRATOR_INPUT_SCHEMA.shape> = {
  toolId: 'sfmobile-native-project-manager',
  name: 'Salesforce Mobile Native Project Manager',
  title: 'Salesforce Mobile Native Project Manager Orchestrator',
  description: 'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.',
  inputSchema: ORCHESTRATOR_INPUT_SCHEMA,
} as const;
