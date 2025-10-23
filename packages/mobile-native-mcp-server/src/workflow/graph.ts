/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { MobileNativeWorkflowState } from './metadata.js';
import { EnvironmentValidationNode } from './nodes/environment.js';
import { TemplateDiscoveryNode } from './nodes/templateDiscovery.js';
import { ProjectGenerationNode } from './nodes/projectGeneration.js';
import { BuildValidationNode } from './nodes/buildValidation.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { CheckBuildSuccessfulRouter } from './nodes/checkBuildSuccessfulRouter.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { UserInputExtractionNode } from './nodes/userInputExtraction.js';
import { CheckPropertiesFulFilledRouter } from './nodes/checkPropertiesFulfilledRouter.js';
import { GetUserInputNode } from './nodes/getUserInput.js';
import { FailureNode } from './nodes/failureNode.js';
import { CheckEnvironmentValidatedRouter } from './nodes/checkEnvironmentValidated.js';
import { MagiInitializationNode } from './nodes/magiInitialization.js';
import { FeatureBriefGenerationNode } from './nodes/featureBriefGeneration.js';
import { FunctionalRequirementsGenerationNode } from './nodes/functionalRequirementsGeneration.js';
import { RequirementsReviewNode } from './nodes/requirementsReview.js';
import { GapAnalysisNode } from './nodes/gapAnalysis.js';
import { RequirementsIterationControlNode } from './nodes/requirementsIterationControl.js';
import { PRDGenerationNode } from './nodes/prdGeneration.js';
import { PRDReviewNode } from './nodes/prdReview.js';
import { PRDFinalizationNode } from './nodes/prdFinalization.js';

const initialUserInputExtractionNode = new UserInputExtractionNode();
const userInputNode = new GetUserInputNode();
const environmentValidationNode = new EnvironmentValidationNode();
const templateDiscoveryNode = new TemplateDiscoveryNode();
const projectGenerationNode = new ProjectGenerationNode();
const buildValidationNode = new BuildValidationNode();
const buildRecoveryNode = new BuildRecoveryNode();
const deploymentNode = new DeploymentNode();
const completionNode = new CompletionNode();
const failureNode = new FailureNode();
const checkPropertiesFulFilledRouter = new CheckPropertiesFulFilledRouter(
  templateDiscoveryNode.name,
  userInputNode.name
);
const checkEnvironmentValidatedRouter = new CheckEnvironmentValidatedRouter(
  initialUserInputExtractionNode.name,
  failureNode.name
);
const checkBuildSuccessfulRouter = new CheckBuildSuccessfulRouter(
  deploymentNode.name,
  buildRecoveryNode.name,
  failureNode.name
);

/**
 * The main workflow graph for mobile native app development
 * Follows the Plan → Design/Iterate → Run three-phase architecture
 * Steel thread implementation starts with user input triage, then Plan → Run with basic Contact list app
 */
export const mobileNativeWorkflow = new StateGraph(MobileNativeWorkflowState)
  // Add all workflow nodes
  .addNode(environmentValidationNode.name, environmentValidationNode.execute)
  .addNode(initialUserInputExtractionNode.name, initialUserInputExtractionNode.execute)
  .addNode(userInputNode.name, userInputNode.execute)
  .addNode(templateDiscoveryNode.name, templateDiscoveryNode.execute)
  .addNode(projectGenerationNode.name, projectGenerationNode.execute)
  .addNode(buildValidationNode.name, buildValidationNode.execute)
  .addNode(buildRecoveryNode.name, buildRecoveryNode.execute)
  .addNode(deploymentNode.name, deploymentNode.execute)
  .addNode(completionNode.name, completionNode.execute)
  .addNode(failureNode.name, failureNode.execute)

  // Define workflow edges
  .addEdge(START, environmentValidationNode.name)
  .addConditionalEdges(environmentValidationNode.name, checkEnvironmentValidatedRouter.execute)
  .addConditionalEdges(initialUserInputExtractionNode.name, checkPropertiesFulFilledRouter.execute)
  .addEdge(userInputNode.name, initialUserInputExtractionNode.name)
  .addEdge(templateDiscoveryNode.name, projectGenerationNode.name)
  .addEdge(projectGenerationNode.name, buildValidationNode.name)
  // Build validation with recovery loop (similar to user input loop)
  .addConditionalEdges(buildValidationNode.name, checkBuildSuccessfulRouter.execute)
  .addEdge(buildRecoveryNode.name, buildValidationNode.name)
  // Continue to deployment and completion
  .addEdge(deploymentNode.name, completionNode.name)
  .addEdge(completionNode.name, END)
  .addEdge(failureNode.name, END);

const magiInitializationNode = new MagiInitializationNode();

// PRD Generation Workflow Nodes
const featureBriefGenerationNode = new FeatureBriefGenerationNode();
const functionalRequirementsGenerationNode = new FunctionalRequirementsGenerationNode();
const requirementsReviewNode = new RequirementsReviewNode();
const gapAnalysisNode = new GapAnalysisNode();
const requirementsIterationControlNode = new RequirementsIterationControlNode();
const prdGenerationNode = new PRDGenerationNode();
const prdReviewNode = new PRDReviewNode();
const prdFinalizationNode = new PRDFinalizationNode();

/**
 * PRD Generation Workflow Graph
 * Complete flow: Feature Brief → Requirements → Review → Gap Analysis → Iteration Loop → PRD Generation → PRD Review → Finalization
 */
export const prdGenerationWorkflow = new StateGraph(MobileNativeWorkflowState)
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

  // PRD Review → PRD Finalization (if approved) or back to PRD Generation (if modifications needed)
  .addConditionalEdges(prdReviewNode.name, state => {
    const prdApproved = state.prdApproved;
    return prdApproved ? prdFinalizationNode.name : prdGenerationNode.name;
  })

  // PRD Finalization is terminal
  .addEdge(prdFinalizationNode.name, END);
