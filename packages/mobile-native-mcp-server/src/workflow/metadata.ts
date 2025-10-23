/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { PLATFORM_ENUM, PROJECT_NAME_FIELD } from '../common/schemas.js';
import { PropertyMetadata, PropertyMetadataCollection } from '../common/propertyMetadata.js';

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

export const PRODUCT_BRIEF_USER_INPUT_PROPERTIES = {
  purpose: {
    zodType: z.string(),
    description: 'The purpose of this feature.',
    friendlyName: 'purpose',
  } satisfies PropertyMetadata<z.ZodString>,
} as const satisfies PropertyMetadataCollection;

export type ProductBriefUserInputProperties = typeof PRODUCT_BRIEF_USER_INPUT_PROPERTIES;

/**
 * Workflow state annotation for LangGraph
 * Defines the structure of state that flows through the workflow nodes
 */
export const MobileNativeWorkflowState = Annotation.Root({
  projectDirectory: Annotation<string>,
  // Core workflow data
  userInput: Annotation<unknown>,
  platform: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.platform.zodType>>,

  // Plan phase state
  validEnvironment: Annotation<boolean>,
  workflowFatalErrorMessages: Annotation<string[]>,
  selectedTemplate: Annotation<string>,
  projectName: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.projectName.zodType>>,
  projectPath: Annotation<string>,
  packageName: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.packageName.zodType>>,
  organization: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.organization.zodType>>,
  connectedAppClientId: Annotation<string>,
  connectedAppCallbackUri: Annotation<string>,
  loginHost: Annotation<z.infer<typeof WORKFLOW_USER_INPUT_PROPERTIES.loginHost.zodType>>,

  // PRD Generation state
  originalUserUtterance: Annotation<string>,
  featureBrief: Annotation<string>,
  functionalRequirements: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
    }>
  >,
  approvedRequirements: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
    }>
  >,
  rejectedRequirements: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
    }>
  >,
  modifiedRequirements: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
      originalId: string;
      modificationNotes: string;
    }>
  >,
  requirementsReviewSummary: Annotation<string>,

  // Gap Analysis state
  gapAnalysisScore: Annotation<number>,
  identifiedGaps: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      impact: string;
      suggestedRequirements: Array<{
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
        category: string;
      }>;
    }>
  >,
  requirementStrengths: Annotation<
    Array<{
      requirementId: string;
      strengthScore: number;
      strengths: string[];
      weaknesses: string[];
    }>
  >,
  overallAssessment: Annotation<{
    coverageScore: number;
    completenessScore: number;
    clarityScore: number;
    feasibilityScore: number;
  }>,
  gapAnalysisRecommendations: Annotation<string[]>,
  gapAnalysisSummary: Annotation<string>,

  // Iteration Control state
  requirementsIterationCount: Annotation<number>,
  shouldContinueIteration: Annotation<boolean>,
  iterationComplete: Annotation<boolean>,
  userWantsToContinueDespiteGaps: Annotation<boolean>,

  // PRD Generation Results
  prdContent: Annotation<string>,
  prdFilePath: Annotation<string>,
  prdDocumentStatus: Annotation<{
    author: string;
    lastModified: string;
    status: 'draft' | 'finalized';
  }>,
  prdRequirementsCount: Annotation<number>,
  prdTraceabilityTableRows: Annotation<
    Array<{
      requirementId: string;
      technicalRequirementIds: string;
      userStoryIds: string;
    }>
  >,

  // PRD Review and Finalization
  prdApproved: Annotation<boolean>,
  prdModifications: Annotation<
    Array<{
      section: string;
      originalContent: string;
      modifiedContent: string;
      modificationReason: string;
    }>
  >,
  prdUserFeedback: Annotation<string>,
  prdReviewSummary: Annotation<string>,
  prdFinalized: Annotation<boolean>,
  workflowComplete: Annotation<boolean>,

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

export const PRDGenerationWorkflowState = Annotation.Root({
  projectDirectory: Annotation<string>,
});

export type PRDGenerationWorkflowState = typeof PRDGenerationWorkflowState.State;
