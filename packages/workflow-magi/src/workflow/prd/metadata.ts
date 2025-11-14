/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Annotation } from '@langchain/langgraph';

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
  featureBriefModifications: Annotation<
    Array<{
      section: string;
      modificationReason: string;
      requestedContent: string;
    }>
  >,

  // Requirements Review state
  approvedRequirementIds: Annotation<string[]>,
  rejectedRequirementIds: Annotation<string[]>,
  requirementModifications: Annotation<
    Array<{
      requirementId: string;
      modificationReason: string;
      requestedChanges: {
        title?: string;
        description?: string;
        priority?: 'high' | 'medium' | 'low';
        category?: string;
      };
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
  userIterationPreference: Annotation<boolean>,

  // PRD Review state
  isPrdApproved: Annotation<boolean>,
  prdModifications: Annotation<
    Array<{
      section: string;
      modificationReason: string;
      requestedContent: string;
    }>
  >,

  // Error Handling state
  prdWorkflowFatalErrorMessages: Annotation<string[]>,
});

export type PRDState = typeof PRDGenerationWorkflowState.State;
