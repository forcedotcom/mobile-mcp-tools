/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { MobileNativeWorkflowState, State, WORKFLOW_USER_INPUT_PROPERTIES } from './metadata.js';
import { EnvironmentValidationNode } from './nodes/environment.js';
import { TemplateDiscoveryNode } from './nodes/templateDiscovery.js';
import { ProjectGenerationNode } from './nodes/projectGeneration.js';
import { BuildValidationNode } from './nodes/buildValidation.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { CheckBuildSuccessfulRouter } from './nodes/checkBuildSuccessfulRouter.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { CheckPropertiesFulFilledRouter } from './nodes/checkPropertiesFulfilledRouter.js';
import { FailureNode } from './nodes/failureNode.js';
import { CheckEnvironmentValidatedRouter } from './nodes/checkEnvironmentValidated.js';
import { PlatformCheckNode } from './nodes/checkPlatformSetup.js';
import { CheckSetupValidatedRouter } from './nodes/checkSetupValidatedRouter.js';
import { PluginCheckNode } from './nodes/checkPluginSetup.js';
import { CheckPluginValidatedRouter } from './nodes/checkPluginValidatedRouter.js';
import {
  createGetUserInputNode,
  createUserInputExtractionNode,
} from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_GET_INPUT_TOOL_ID } from '../tools/utils/sfmobile-native-get-input/metadata.js';
import { SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID } from '../tools/utils/sfmobile-native-input-extraction/metadata.js';

const initialUserInputExtractionNode = createUserInputExtractionNode<State>({
  requiredProperties: WORKFLOW_USER_INPUT_PROPERTIES,
  toolId: SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID,
});

const userInputNode = createGetUserInputNode<State>({
  requiredProperties: WORKFLOW_USER_INPUT_PROPERTIES,
  toolId: SFMOBILE_NATIVE_GET_INPUT_TOOL_ID,
  userInputProperty: 'userInput',
});
const environmentValidationNode = new EnvironmentValidationNode();
const platformCheckNode = new PlatformCheckNode();
const pluginCheckNode = new PluginCheckNode();
const templateDiscoveryNode = new TemplateDiscoveryNode();
const projectGenerationNode = new ProjectGenerationNode();
const buildValidationNode = new BuildValidationNode();
const buildRecoveryNode = new BuildRecoveryNode();
const deploymentNode = new DeploymentNode();
const completionNode = new CompletionNode();
const failureNode = new FailureNode();
const checkPropertiesFulFilledRouter = new CheckPropertiesFulFilledRouter(
  platformCheckNode.name,
  userInputNode.name
);
const checkEnvironmentValidatedRouter = new CheckEnvironmentValidatedRouter(
  initialUserInputExtractionNode.name,
  failureNode.name
);
const checkSetupValidatedRouter = new CheckSetupValidatedRouter(
  pluginCheckNode.name,
  failureNode.name
);

const checkPluginValidatedRouter = new CheckPluginValidatedRouter(
  templateDiscoveryNode.name,
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
  .addNode(platformCheckNode.name, platformCheckNode.execute)
  .addNode(pluginCheckNode.name, pluginCheckNode.execute)
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
  .addConditionalEdges(platformCheckNode.name, checkSetupValidatedRouter.execute)
  .addConditionalEdges(pluginCheckNode.name, checkPluginValidatedRouter.execute)
  .addEdge(templateDiscoveryNode.name, projectGenerationNode.name)
  .addEdge(projectGenerationNode.name, buildValidationNode.name)
  // Build validation with recovery loop (similar to user input loop)
  .addConditionalEdges(buildValidationNode.name, checkBuildSuccessfulRouter.execute)
  .addEdge(buildRecoveryNode.name, buildValidationNode.name)
  // Continue to deployment and completion
  .addEdge(deploymentNode.name, completionNode.name)
  .addEdge(completionNode.name, END)
  .addEdge(failureNode.name, END);
