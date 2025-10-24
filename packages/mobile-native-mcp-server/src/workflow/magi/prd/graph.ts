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
import { PRDFunctionalRequirementsGenerationNode } from './nodes/prdFunctionalRequirementsGeneration.js';
import { PRDRequirementsReviewNode } from './nodes/prdRequirementsReview.js';
import { PRDGapAnalysisNode } from './nodes/prdGapAnalysis.js';
import { PRDRequirementsIterationControlNode } from './nodes/prdRequirementsIterationControl.js';
import { PRDGenerationNode } from './nodes/prdGeneration.js';
import { PRDReviewNode } from './nodes/prdReview.js';
import { PRDFinalizationNode } from './nodes/prdFinalization.js';

// Create PRD-specific workflow nodes
const magiInitializationNode = new PRDMagiInitializationNode();
const featureBriefGenerationNode = new PRDFeatureBriefGenerationNode();
const functionalRequirementsGenerationNode = new PRDFunctionalRequirementsGenerationNode();
const requirementsReviewNode = new PRDRequirementsReviewNode();
const gapAnalysisNode = new PRDGapAnalysisNode();
const requirementsIterationControlNode = new PRDRequirementsIterationControlNode();
const prdGenerationNode = new PRDGenerationNode();
const prdReviewNode = new PRDReviewNode();
const prdFinalizationNode = new PRDFinalizationNode();

/**
 * PRD Generation Workflow Graph
 *
 * This workflow orchestrates the complete PRD generation process:
 * 1. Initialize project and extract user requirements
 * 2. Generate feature brief
 * 3. Generate functional requirements
 * 4. Review requirements
 * 5. Perform gap analysis
 * 6. Iterate on requirements if needed
 * 7. Generate PRD
 * 8. Review PRD
 * 9. Finalize workflow
 */
export const prdGenerationWorkflow = new StateGraph(PRDGenerationWorkflowState)
  // Add all PRD generation workflow nodes
  .addNode(magiInitializationNode.name, magiInitializationNode.execute)
  .addNode(featureBriefGenerationNode.name, featureBriefGenerationNode.execute)
  .addNode(functionalRequirementsGenerationNode.name, functionalRequirementsGenerationNode.execute)
  .addNode(requirementsReviewNode.name, requirementsReviewNode.execute)
  .addNode(gapAnalysisNode.name, gapAnalysisNode.execute)
  .addNode(requirementsIterationControlNode.name, requirementsIterationControlNode.execute)
  .addNode(prdGenerationNode.name, prdGenerationNode.execute)
  .addNode(prdReviewNode.name, prdReviewNode.execute)
  .addNode(prdFinalizationNode.name, prdFinalizationNode.execute)

  // Define workflow edges
  .addEdge(START, magiInitializationNode.name)
  .addEdge(magiInitializationNode.name, featureBriefGenerationNode.name)
  .addEdge(featureBriefGenerationNode.name, functionalRequirementsGenerationNode.name)
  .addEdge(functionalRequirementsGenerationNode.name, requirementsReviewNode.name)
  .addEdge(requirementsReviewNode.name, gapAnalysisNode.name)

  // Gap Analysis → Iteration Control (conditional)
  .addConditionalEdges(gapAnalysisNode.name, state => {
    // Check if we should continue iteration or proceed to PRD generation
    const shouldContinue = state.shouldContinueIteration;
    return shouldContinue ? requirementsIterationControlNode.name : prdGenerationNode.name;
  })

  // Iteration Control → Requirements Generation (if continuing) or PRD Generation (if stopping)
  .addConditionalEdges(requirementsIterationControlNode.name, state => {
    const shouldContinue = state.shouldContinueIteration;
    return shouldContinue ? functionalRequirementsGenerationNode.name : prdGenerationNode.name;
  })

  // PRD Generation → PRD Review
  .addEdge(prdGenerationNode.name, prdReviewNode.name)

  // PRD Review → Finalization (conditional)
  .addConditionalEdges(prdReviewNode.name, state => {
    // Check if PRD is approved
    const isApproved = state.prdApproved;
    return isApproved ? prdFinalizationNode.name : prdGenerationNode.name; // Re-generate if not approved
  })

  // Finalization → END
  .addEdge(prdFinalizationNode.name, END);
