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
import { PRDInitialRequirementsGenerationNode } from './nodes/prdInitialRequirementsGeneration.js';
import { PRDGapRequirementsGenerationNode } from './nodes/prdGapRequirementsGeneration.js';
import { PRDRequirementsReviewNode } from './nodes/prdRequirementsReview.js';
import { PRDGapAnalysisNode } from './nodes/prdGapAnalysis.js';
import { PRDRequirementsIterationControlNode } from './nodes/prdRequirementsIterationControl.js';
import { PRDGenerationNode } from './nodes/prdGeneration.js';
import { PRDReviewNode } from './nodes/prdReview.js';
import { PRDFinalizationNode } from './nodes/prdFinalization.js';
import { PRDFailureNode } from './nodes/prdFailure.js';
import { PRDInitializationValidatedRouter } from './nodes/prdInitializationValidatedRouter.js';

// Create PRD-specific workflow nodes
const magiInitializationNode = new PRDMagiInitializationNode();
const featureBriefGenerationNode = new PRDFeatureBriefGenerationNode();
const featureBriefUpdateNode = new PRDFeatureBriefUpdateNode();
const featureBriefReviewNode = new PRDFeatureBriefReviewNode();
const initialRequirementsGenerationNode = new PRDInitialRequirementsGenerationNode();
const gapRequirementsGenerationNode = new PRDGapRequirementsGenerationNode();
const requirementsReviewNode = new PRDRequirementsReviewNode();
const gapAnalysisNode = new PRDGapAnalysisNode();
const requirementsIterationControlNode = new PRDRequirementsIterationControlNode();
const prdGenerationNode = new PRDGenerationNode();
const prdReviewNode = new PRDReviewNode();
const prdFinalizationNode = new PRDFinalizationNode();
const prdFailureNode = new PRDFailureNode();

// Create router for initialization validation
const prdInitializationValidatedRouter = new PRDInitializationValidatedRouter(
  featureBriefGenerationNode.name,
  prdFailureNode.name
);

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
 * 8. Generate PRD
 * 9. Review PRD
 * 10. Finalize workflow
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
  .addNode(initialRequirementsGenerationNode.name, initialRequirementsGenerationNode.execute)
  .addNode(gapRequirementsGenerationNode.name, gapRequirementsGenerationNode.execute)
  .addNode(requirementsReviewNode.name, requirementsReviewNode.execute)
  .addNode(gapAnalysisNode.name, gapAnalysisNode.execute)
  .addNode(requirementsIterationControlNode.name, requirementsIterationControlNode.execute)
  .addNode(prdGenerationNode.name, prdGenerationNode.execute)
  .addNode(prdReviewNode.name, prdReviewNode.execute)
  .addNode(prdFinalizationNode.name, prdFinalizationNode.execute)
  .addNode(prdFailureNode.name, prdFailureNode.execute)

  // Define workflow edges
  .addEdge(START, magiInitializationNode.name)

  // Magi Initialization → Feature Brief Generation (conditional on validation success)
  .addConditionalEdges(magiInitializationNode.name, prdInitializationValidatedRouter.execute)

  // Feature Brief flow - Generation → Review → Conditional
  .addEdge(featureBriefGenerationNode.name, featureBriefReviewNode.name)
  .addConditionalEdges(featureBriefReviewNode.name, state => {
    const isApproved = state.isFeatureBriefApproved;
    // If approved, proceed to requirements generation
    // If not approved, route to update node (not generation node)
    return isApproved ? initialRequirementsGenerationNode.name : featureBriefUpdateNode.name;
  })
  // Update → Review (loop back to review after update)
  .addEdge(featureBriefUpdateNode.name, featureBriefReviewNode.name)

  // Initial requirements flow - from approved feature brief
  .addEdge(initialRequirementsGenerationNode.name, requirementsReviewNode.name)
  .addEdge(requirementsReviewNode.name, gapAnalysisNode.name)

  // Gap Analysis → Requirements Iteration Control (always go through control node)
  .addEdge(gapAnalysisNode.name, requirementsIterationControlNode.name)

  // Iteration Control → Gap-Based Requirements Generation (if continuing) or PRD Generation (if stopping)
  .addConditionalEdges(requirementsIterationControlNode.name, state => {
    const shouldIterate = state.shouldIterate;
    return shouldIterate ? gapRequirementsGenerationNode.name : prdGenerationNode.name;
  })

  // Gap-Based Requirements → Requirements Review
  .addEdge(gapRequirementsGenerationNode.name, requirementsReviewNode.name)

  // PRD Generation → PRD Review
  .addEdge(prdGenerationNode.name, prdReviewNode.name)

  // PRD Review → Finalization (conditional)
  .addConditionalEdges(prdReviewNode.name, state => {
    // Check if PRD is approved
    const isApproved = state.isPrdApproved;
    return isApproved ? prdFinalizationNode.name : prdGenerationNode.name; // Re-generate if not approved
  })

  // Finalization → END
  .addEdge(prdFinalizationNode.name, END)

  // Error handling → END
  .addEdge(prdFailureNode.name, END);
