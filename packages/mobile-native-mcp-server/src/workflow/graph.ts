/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import {
  MobileNativeWorkflowState,
  State,
  WORKFLOW_USER_INPUT_PROPERTIES,
  ANDROID_SETUP_PROPERTIES,
} from './metadata.js';
import { EnvironmentValidationNode } from './nodes/environment.js';
import { TemplateOptionsFetchNode } from './nodes/templateOptionsFetch.js';
import { TemplateSelectionNode } from './nodes/templateSelection.js';
import { ProjectGenerationNode } from './nodes/projectGeneration.js';
import { BuildValidationNode } from './nodes/buildValidation.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { CheckBuildSuccessfulRouter } from './nodes/checkBuildSuccessfulRouter.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { FailureNode } from './nodes/failureNode.js';
import { CheckEnvironmentValidatedRouter } from './nodes/checkEnvironmentValidated.js';
import { PlatformCheckNode } from './nodes/checkPlatformSetup.js';
import { CheckSetupValidatedRouter } from './nodes/checkSetupValidatedRouter.js';
import { TemplatePropertiesExtractionNode } from './nodes/templatePropertiesExtraction.js';
import { TemplatePropertiesUserInputNode } from './nodes/templatePropertiesUserInput.js';
import { CheckTemplatePropertiesFulfilledRouter } from './nodes/checkTemplatePropertiesFulfilledRouter.js';
import { CheckAndroidSetupExtractedRouter } from './nodes/checkAndroidSetupExtractedRouter.js';
import { ExtractAndroidSetupNode } from './nodes/extractAndroidSetup.js';
import { PluginCheckNode } from './nodes/checkPluginSetup.js';
import { CheckPluginValidatedRouter } from './nodes/checkPluginValidatedRouter.js';
import {
  createGetUserInputNode,
  createUserInputExtractionNode,
  CheckPropertiesFulfilledRouter,
} from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_GET_INPUT_TOOL_ID } from '../tools/utils/sfmobile-native-get-input/metadata.js';
import { SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID } from '../tools/utils/sfmobile-native-input-extraction/metadata.js';

const initialUserInputExtractionNode = createUserInputExtractionNode<State>({
  requiredProperties: WORKFLOW_USER_INPUT_PROPERTIES,
  toolId: SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID,
  userInputProperty: 'userInput',
});

const userInputNode = createGetUserInputNode<State>({
  requiredProperties: WORKFLOW_USER_INPUT_PROPERTIES,
  toolId: SFMOBILE_NATIVE_GET_INPUT_TOOL_ID,
  userInputProperty: 'userInput',
});

const getAndroidSetupNode = createGetUserInputNode<State>({
  requiredProperties: ANDROID_SETUP_PROPERTIES,
  toolId: SFMOBILE_NATIVE_GET_INPUT_TOOL_ID,
  userInputProperty: 'userInput',
  nodeName: 'getAndroidSetup',
});

const extractAndroidSetupNode = new ExtractAndroidSetupNode();

const environmentValidationNode = new EnvironmentValidationNode();
const platformCheckNode = new PlatformCheckNode();
const pluginCheckNode = new PluginCheckNode();
const templateOptionsFetchNode = new TemplateOptionsFetchNode();
const templateSelectionNode = new TemplateSelectionNode();
const templatePropertiesExtractionNode = new TemplatePropertiesExtractionNode();
const templatePropertiesUserInputNode = new TemplatePropertiesUserInputNode();
const projectGenerationNode = new ProjectGenerationNode();
const buildValidationNode = new BuildValidationNode();
const buildRecoveryNode = new BuildRecoveryNode();
const deploymentNode = new DeploymentNode();
const completionNode = new CompletionNode();
const failureNode = new FailureNode();
const checkPropertiesFulFilledRouter = new CheckPropertiesFulfilledRouter<State>(
  platformCheckNode.name,
  userInputNode.name,
  WORKFLOW_USER_INPUT_PROPERTIES
);
const checkEnvironmentValidatedRouter = new CheckEnvironmentValidatedRouter(
  initialUserInputExtractionNode.name,
  failureNode.name
);
const checkSetupValidatedRouter = new CheckSetupValidatedRouter(
  pluginCheckNode.name,
  getAndroidSetupNode.name,
  failureNode.name
);

const checkPluginValidatedRouter = new CheckPluginValidatedRouter(
  templateOptionsFetchNode.name,
  failureNode.name
);
const checkAndroidSetupExtractedRouter = new CheckAndroidSetupExtractedRouter(
  platformCheckNode.name,
  failureNode.name
);

const checkBuildSuccessfulRouter = new CheckBuildSuccessfulRouter(
  deploymentNode.name,
  buildRecoveryNode.name,
  failureNode.name
);

const checkTemplatePropertiesFulfilledRouter = new CheckTemplatePropertiesFulfilledRouter(
  projectGenerationNode.name,
  templatePropertiesUserInputNode.name
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
  .addNode(getAndroidSetupNode.name, getAndroidSetupNode.execute)
  .addNode(extractAndroidSetupNode.name, extractAndroidSetupNode.execute)
  .addNode(pluginCheckNode.name, pluginCheckNode.execute)
  .addNode(templateOptionsFetchNode.name, templateOptionsFetchNode.execute)
  .addNode(templateSelectionNode.name, templateSelectionNode.execute)
  .addNode(templatePropertiesExtractionNode.name, templatePropertiesExtractionNode.execute)
  .addNode(templatePropertiesUserInputNode.name, templatePropertiesUserInputNode.execute)
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
  // Android setup recovery flow
  .addEdge(getAndroidSetupNode.name, extractAndroidSetupNode.name)
  .addConditionalEdges(extractAndroidSetupNode.name, checkAndroidSetupExtractedRouter.execute)
  .addConditionalEdges(pluginCheckNode.name, checkPluginValidatedRouter.execute)
  .addEdge(templateOptionsFetchNode.name, templateSelectionNode.name)
  .addEdge(templateSelectionNode.name, templatePropertiesExtractionNode.name)
  .addConditionalEdges(
    templatePropertiesExtractionNode.name,
    checkTemplatePropertiesFulfilledRouter.execute
  )
  .addEdge(templatePropertiesUserInputNode.name, templatePropertiesExtractionNode.name)
  .addEdge(projectGenerationNode.name, buildValidationNode.name)
  // Build validation with recovery loop (similar to user input loop)
  .addConditionalEdges(buildValidationNode.name, checkBuildSuccessfulRouter.execute)
  .addEdge(buildRecoveryNode.name, buildValidationNode.name)
  // Continue to deployment and completion
  .addEdge(deploymentNode.name, completionNode.name)
  .addEdge(completionNode.name, END)
  .addEdge(failureNode.name, END);
