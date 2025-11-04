/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { PRDGenerationWorkflowState } from './metadata.js';

// Import all PRD-specific workflow nodes
import { PRDMagiInitializationNode } from './nodes/prdMagiInitialization.js';
import { PRDFeatureBriefGenerationNode } from './nodes/prdFeatureBriefGeneration.js';
import { PRDFeatureBriefUpdateNode } from './nodes/prdFeatureBriefUpdate.js';
import { PRDFeatureBriefReviewNode } from './nodes/prdFeatureBriefReview.js';
import { PRDFeatureBriefFinalizationNode } from './nodes/prdFeatureBriefFinalization.js';
import { PRDInitialRequirementsGenerationNode } from './nodes/prdInitialRequirementsGeneration.js';
import { PRDGapRequirementsGenerationNode } from './nodes/prdGapRequirementsGeneration.js';
import { PRDRequirementsReviewNode } from './nodes/prdRequirementsReview.js';
import { PRDRequirementsUpdateNode } from './nodes/prdRequirementsUpdate.js';
import { PRDRequirementsFinalizationNode } from './nodes/prdRequirementsFinalization.js';
import { PRDGapAnalysisNode } from './nodes/prdGapAnalysis.js';
import { PRDGenerationNode } from './nodes/prdGeneration.js';
import { PRDReviewNode } from './nodes/prdReview.js';
import { PRDUpdateNode } from './nodes/prdUpdate.js';
import { PRDFinalizationNode } from './nodes/prdFinalization.js';
import { PRDFailureNode } from './nodes/prdFailure.js';

// Create PRD-specific workflow nodes
const magiInitializationNode = new PRDMagiInitializationNode();
const featureBriefGenerationNode = new PRDFeatureBriefGenerationNode();
const featureBriefUpdateNode = new PRDFeatureBriefUpdateNode();
const featureBriefReviewNode = new PRDFeatureBriefReviewNode();
const featureBriefFinalizationNode = new PRDFeatureBriefFinalizationNode();
const initialRequirementsGenerationNode = new PRDInitialRequirementsGenerationNode();
const gapRequirementsGenerationNode = new PRDGapRequirementsGenerationNode();
const requirementsReviewNode = new PRDRequirementsReviewNode();
const requirementsUpdateNode = new PRDRequirementsUpdateNode();
const requirementsFinalizationNode = new PRDRequirementsFinalizationNode();
const gapAnalysisNode = new PRDGapAnalysisNode();
const prdGenerationNode = new PRDGenerationNode();
const prdReviewNode = new PRDReviewNode();
const prdUpdateNode = new PRDUpdateNode();
const prdFinalizationNode = new PRDFinalizationNode();
const prdFailureNode = new PRDFailureNode();

/**
 * PRD Generation Workflow Graph
 *
 * This workflow orchestrates the complete PRD generation process:
 * 1. Initialize project and extract user requirements
 * 2. Generate feature brief
 * 3. Generate initial functional requirements from feature brief
 * 4. Review requirements
 * 5. Perform gap analysis
 * 6. Generate additional requirements based on gaps if needed
 * 7. Review additional requirements
 * 8. Finalize requirements (update status to approved)
 * 9. Generate PRD
 * 10. Review PRD
 * 11. Finalize workflow
 *
 * Error Handling:
 * - The Failure Node handles non-recoverable errors
 * - Orchestrator catches errors and routes to failure node
 * - Failure node communicates errors to user and terminates workflow
 */
export const prdGenerationWorkflow = new StateGraph(PRDGenerationWorkflowState)
  // need a node that can take in ambiguous input

  // Add all PRD generation workflow nodes
  .addNode(magiInitializationNode.name, magiInitializationNode.execute)
  .addNode(featureBriefGenerationNode.name, featureBriefGenerationNode.execute)
  .addNode(featureBriefUpdateNode.name, featureBriefUpdateNode.execute)
  .addNode(featureBriefReviewNode.name, featureBriefReviewNode.execute)
  .addNode(featureBriefFinalizationNode.name, featureBriefFinalizationNode.execute)
  .addNode(initialRequirementsGenerationNode.name, initialRequirementsGenerationNode.execute)
  .addNode(gapRequirementsGenerationNode.name, gapRequirementsGenerationNode.execute)
  .addNode(requirementsReviewNode.name, requirementsReviewNode.execute)
  .addNode(requirementsUpdateNode.name, requirementsUpdateNode.execute)
  .addNode(requirementsFinalizationNode.name, requirementsFinalizationNode.execute)
  .addNode(gapAnalysisNode.name, gapAnalysisNode.execute)
  .addNode(prdGenerationNode.name, prdGenerationNode.execute)
  .addNode(prdReviewNode.name, prdReviewNode.execute)
  .addNode(prdUpdateNode.name, prdUpdateNode.execute)
  .addNode(prdFinalizationNode.name, prdFinalizationNode.execute)
  .addNode(prdFailureNode.name, prdFailureNode.execute)

  // Define workflow edges
  .addEdge(START, magiInitializationNode.name)

  // Magi Initialization → Feature Brief Generation (conditional on validation success)
  .addConditionalEdges(magiInitializationNode.name, state => {
    // If there are fatal error messages, route to failure
    const hasErrors =
      state.prdWorkflowFatalErrorMessages && state.prdWorkflowFatalErrorMessages.length > 0;
    return hasErrors ? prdFailureNode.name : featureBriefGenerationNode.name;
  })

  // Feature Brief flow - Generation → Review → Conditional routing
  .addEdge(featureBriefGenerationNode.name, featureBriefReviewNode.name)
  // Review → Conditional: if approved, go to finalization; if not approved, go to update
  .addConditionalEdges(featureBriefReviewNode.name, state => {
    const isApproved = state.isFeatureBriefApproved;
    return isApproved ? featureBriefFinalizationNode.name : featureBriefUpdateNode.name;
  })
  // Update → Review (loop back to review after applying modifications)
  .addEdge(featureBriefUpdateNode.name, featureBriefReviewNode.name)
  // Finalization → Requirements Generation (proceed after approval)
  .addEdge(featureBriefFinalizationNode.name, initialRequirementsGenerationNode.name)

  // Initial requirements flow - from approved feature brief
  .addEdge(initialRequirementsGenerationNode.name, requirementsReviewNode.name)
  // Requirements Review → Conditional routing based on user decisions
  .addConditionalEdges(requirementsReviewNode.name, state => {
    // If user wants to finalize, skip everything and go straight to finalization
    if (state.userIterationPreference === true) {
      return requirementsFinalizationNode.name;
    }
    // If there are modifications, apply them first
    const hasModifications =
      state.requirementModifications && state.requirementModifications.length > 0;
    return hasModifications ? requirementsUpdateNode.name : gapAnalysisNode.name;
  })
  // Update → Review (loop back to review after applying modifications)
  .addEdge(requirementsUpdateNode.name, requirementsReviewNode.name)

  // Gap Analysis → Conditional: Generate gap-based requirements if score < 80, otherwise finalize
  .addConditionalEdges(gapAnalysisNode.name, state => {
    const gapScore = state.gapAnalysisScore ?? 0;
    const shouldIterate = gapScore < 80;
    return shouldIterate ? gapRequirementsGenerationNode.name : requirementsFinalizationNode.name;
  })

  // Requirements Finalization → PRD Generation (always proceed after finalization)
  .addEdge(requirementsFinalizationNode.name, prdGenerationNode.name)

  // Gap-Based Requirements → Requirements Review (will route to update if modifications needed)
  .addEdge(gapRequirementsGenerationNode.name, requirementsReviewNode.name)

  // PRD Generation → PRD Review
  .addEdge(prdGenerationNode.name, prdReviewNode.name)

  // PRD Review → Conditional routing based on approval
  .addConditionalEdges(prdReviewNode.name, state => {
    // Check if PRD is approved
    const isApproved = state.isPrdApproved;
    return isApproved ? prdFinalizationNode.name : prdUpdateNode.name;
  })
  // Update → Review (loop back to review after applying modifications)
  .addEdge(prdUpdateNode.name, prdReviewNode.name)

  // Finalization → END
  .addEdge(prdFinalizationNode.name, END)

  // Error handling → END
  .addEdge(prdFailureNode.name, END);
