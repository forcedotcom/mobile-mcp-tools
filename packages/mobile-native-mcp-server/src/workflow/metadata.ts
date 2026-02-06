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
 * Information about a Connected App from Salesforce org metadata
 */
export interface ConnectedAppInfo {
  fullName: string;
  createdByName: string;
}

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
} as const satisfies PropertyMetadataCollection;

export type WorkflowUserInputProperties = typeof WORKFLOW_USER_INPUT_PROPERTIES;

/**
 * Definition of Android setup properties required when Android/Java environment is not configured.
 * Used during the recovery flow to collect environment paths from the user.
 */
export const ANDROID_SETUP_PROPERTIES = {
  androidInstalled: {
    zodType: z.boolean(),
    description:
      'Whether both Android SDK and Java 17+ are installed. If yes, ANDROID_HOME and JAVA_HOME paths must also be provided.',
    friendlyName: 'Android and Java installation status',
  } satisfies PropertyMetadata<z.ZodBoolean>,
  androidHome: {
    zodType: z.string(),
    description:
      'The absolute path to ANDROID_HOME directory (e.g. /Users/username/Library/Android/sdk). Required if androidInstalled is true.',
    friendlyName: 'ANDROID_HOME path',
  } satisfies PropertyMetadata<z.ZodString>,
  javaHome: {
    zodType: z.string(),
    description:
      'The absolute path to JAVA_HOME directory (e.g. /Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home). Required if androidInstalled is true.',
    friendlyName: 'JAVA_HOME path',
  } satisfies PropertyMetadata<z.ZodString>,
} as const satisfies PropertyMetadataCollection;

export type AndroidSetupProperties = typeof ANDROID_SETUP_PROPERTIES;

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
  validPlatformSetup: Annotation<boolean>,
  validPluginSetup: Annotation<boolean>,
  workflowFatalErrorMessages: Annotation<string[]>,
  templateOptions: Annotation<TemplateListOutput>,

  // Android setup state (for recovery flow)
  androidInstalled: Annotation<z.infer<typeof ANDROID_SETUP_PROPERTIES.androidInstalled.zodType>>,
  androidHome: Annotation<z.infer<typeof ANDROID_SETUP_PROPERTIES.androidHome.zodType>>,
  javaHome: Annotation<z.infer<typeof ANDROID_SETUP_PROPERTIES.javaHome.zodType>>,

  selectedTemplate: Annotation<string>,
  templateProperties: Annotation<Record<string, string>>,
  templatePropertiesMetadata: Annotation<TemplatePropertiesMetadata>,
  projectName: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.projectName.zodType>>,
  projectPath: Annotation<string>,
  packageName: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.packageName.zodType>>,
  organization: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.organization.zodType>>,

  // Connected App state (for MSDK apps)
  connectedAppList: Annotation<ConnectedAppInfo[]>,
  selectedConnectedAppName: Annotation<string>,
  connectedAppClientId: Annotation<string>,
  connectedAppCallbackUri: Annotation<string>,
  loginHost: Annotation<string>,

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
  androidEmulatorName: Annotation<string>,
});

export type State = typeof MobileNativeWorkflowState.State;
