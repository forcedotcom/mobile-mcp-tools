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
    description: 'The path to the mobile project directory',
    friendlyName: 'project path',
  },
  originalUserUtterance: {
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
  projectPath: Annotation<string>,
  originalUserUtterance: Annotation<string>,

  // Feature Brief Generation state
  featureBrief: Annotation<string>,

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

  // Requirements Review state
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
});

export type PRDState = typeof PRDGenerationWorkflowState.State;
