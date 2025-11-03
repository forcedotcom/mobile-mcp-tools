/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Annotation } from '@langchain/langgraph';
import z from 'zod';

/**
 * PRD-specific user input properties required by the PRD generation workflow.
 * These are focused on PRD generation rather than mobile app project setup.
 */
export const PRD_USER_INPUT_PROPERTIES = {
  projectPath: {
    zodType: z.string(),
    description: 'The path to the root project directory',
    friendlyName: 'project path',
  },
  userUtterance: {
    zodType: z.string(),
    description: 'The original user request or description of the feature',
    friendlyName: 'original user request',
  },
} as const;

export type PRDUserInputProperties = typeof PRD_USER_INPUT_PROPERTIES;

/**
 * Standalone PRD Generation Workflow State
 *
 * This state is completely separate from the main mobile native workflow state
 * and focuses specifically on PRD generation activities.
 */
export const PRDGenerationWorkflowState = Annotation.Root({
  // Core PRD workflow data
  userInput: Annotation<Record<string, unknown>>,
  projectPath: Annotation<string>,
  featureId: Annotation<string>,
  userUtterance: Annotation<string>,

  // Feature Brief Review state
  isFeatureBriefApproved: Annotation<boolean>,
  featureBriefUserFeedback: Annotation<string>,
  featureBriefModifications: Annotation<
    Array<{
      section: string;
      modificationReason: string;
      requestedContent: string;
    }>
  >,

  // Functional Requirements state
  functionalRequirements: Annotation<
    Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
    }>
  >,

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

  // Iteration Control state
  shouldIterate: Annotation<boolean>,
  userIterationOverride: Annotation<boolean>,

  // PRD Generation Results
  prdContent: Annotation<string>,
  prdStatus: Annotation<{
    author: string;
    lastModified: string;
    status: 'draft' | 'finalized';
  }>,

  // PRD Review
  isPrdApproved: Annotation<boolean>,

  // Error Handling state
  prdWorkflowFatalErrorMessages: Annotation<string[]>,
});

export type PRDState = typeof PRDGenerationWorkflowState.State;
