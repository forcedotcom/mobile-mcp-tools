/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { PLATFORM_ENUM, PROJECT_NAME_FIELD, TemplateListOutput } from '../common/schemas.js';
import { PropertyMetadata, PropertyMetadataCollection } from '@salesforce/magen-mcp-workflow';

/**
 * Metadata for a custom template property
 * This matches the structure returned from template discovery
 */
export interface TemplatePropertyMetadata {
  value?: string;
  required: boolean;
  description: string;
}

/**
 * Collection of template property metadata
 */
export type TemplatePropertiesMetadata = Record<string, TemplatePropertyMetadata>;

/**
 * Definition of all user input properties required by the mobile native workflow.
 * Each property includes metadata for extraction, validation, and user prompting.
 *
 * This collection serves as the single source of truth for what data needs to be
 * collected from users during the workflow initialization phase.
 */
export const WORKFLOW_USER_INPUT_PROPERTIES = {
  platform: {
    zodType: PLATFORM_ENUM,
    description: 'Target mobile platform for the mobile app (iOS or Android)',
    friendlyName: 'mobile platform',
  } satisfies PropertyMetadata<typeof PLATFORM_ENUM>,
  projectName: {
    zodType: PROJECT_NAME_FIELD,
    description: PROJECT_NAME_FIELD.description!,
    friendlyName: 'project name',
  } satisfies PropertyMetadata<z.ZodString>,
  packageName: {
    zodType: z.string(),
    description: 'The package identifier of the mobile app, for example com.company.appname',
    friendlyName: 'package identifier',
  } satisfies PropertyMetadata<z.ZodString>,
  organization: {
    zodType: z.string(),
    description: 'The organization or company name',
    friendlyName: 'organization or company name',
  } satisfies PropertyMetadata<z.ZodString>,
  loginHost: {
    zodType: z.string(),
    description: 'The Salesforce login host for the mobile app.',
    friendlyName: 'Salesforce login host',
  } satisfies PropertyMetadata<z.ZodString>,
} as const satisfies PropertyMetadataCollection;

export type WorkflowUserInputProperties = typeof WORKFLOW_USER_INPUT_PROPERTIES;

/**
 * Workflow state annotation for LangGraph
 * Defines the structure of state that flows through the workflow nodes
 */
export const MobileNativeWorkflowState = Annotation.Root({
  // Core workflow data
  userInput: Annotation<unknown>,
  templatePropertiesUserInput: Annotation<unknown>,
  platform: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.platform.zodType>>,

  // Plan phase state
  validEnvironment: Annotation<boolean>,
  validPlatformSetup: Annotation<boolean>,
  validPluginSetup: Annotation<boolean>,
  workflowFatalErrorMessages: Annotation<string[]>,
  templateOptions: Annotation<TemplateListOutput>,
  templateCandidates: Annotation<string[]>,
  templateDetails: Annotation<Record<string, unknown>>,
  selectedTemplate: Annotation<string>,
  templateProperties: Annotation<Record<string, string>>,
  templatePropertiesMetadata: Annotation<TemplatePropertiesMetadata>,
  projectName: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.projectName.zodType>>,
  projectPath: Annotation<string>,
  packageName: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.packageName.zodType>>,
  organization: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.organization.zodType>>,
  connectedAppClientId: Annotation<string>,
  connectedAppCallbackUri: Annotation<string>,
  loginHost: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.loginHost.zodType>>,

  // Build and deployment state
  buildType: Annotation<'debug' | 'release'>,
  targetDevice: Annotation<string>,
  buildSuccessful: Annotation<boolean>,
  buildAttemptCount: Annotation<number>,
  buildErrorMessages: Annotation<string[]>,
  maxBuildRetries: Annotation<number>,
  buildOutputFilePath: Annotation<string>,
  recoveryReadyForRetry: Annotation<boolean>,
  deploymentStatus: Annotation<string>,
});

export type State = typeof MobileNativeWorkflowState.State;
