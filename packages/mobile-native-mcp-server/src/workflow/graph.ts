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
import { DefaultBuildExecutor } from '../execution/build/buildExecutor.js';
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
import { CheckProjectGenerationRouter } from './nodes/checkProjectGenerationRouter.js';
import { CheckDeploymentPlatformRouter } from './nodes/checkDeploymentPlatformRouter.js';
import {
  createGetUserInputNode,
  createUserInputExtractionNode,
  CheckPropertiesFulfilledRouter,
  DefaultCommandRunner,
  type Logger,
} from '@salesforce/magen-mcp-workflow';
import {
  iOSSelectSimulatorNode,
  iOSBootSimulatorNode,
  iOSInstallAppNode,
  iOSLaunchAppNode,
  AndroidListDevicesNode,
  AndroidCreateEmulatorNode,
  AndroidStartEmulatorNode,
  AndroidInstallAppNode,
  AndroidLaunchAppNode,
  CheckEmulatorFoundRouter,
  CheckEmulatorCreatedRouter,
  CheckEmulatorStartedRouter,
  CheckAppInstalledRouter,
} from './nodes/deployment/index.js';
import { SFMOBILE_NATIVE_GET_INPUT_TOOL_ID } from '../tools/utils/sfmobile-native-get-input/metadata.js';
import { SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID } from '../tools/utils/sfmobile-native-input-extraction/metadata.js';
import { defaultTempDirectoryManager } from '../common.js';

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
/**
 * Creates the mobile native workflow graph.
 * @param logger - Optional logger
 * @returns Configured workflow graph
 */
export function createMobileNativeWorkflow(logger?: Logger) {
  const commandRunner = new DefaultCommandRunner(logger);
  const tempDirManager = defaultTempDirectoryManager;
  const buildExecutor = new DefaultBuildExecutor(commandRunner, tempDirManager, logger);
  const projectGenerationNode = new ProjectGenerationNode(commandRunner, logger);
  const buildValidationNodeInstance = new BuildValidationNode(buildExecutor);

  // Create iOS deployment nodes
  const iosSelectSimulatorNode = new iOSSelectSimulatorNode(commandRunner, logger);
  const iosBootSimulatorNode = new iOSBootSimulatorNode(commandRunner, logger);
  const iosInstallAppNode = new iOSInstallAppNode(commandRunner, tempDirManager, logger);
  const iosLaunchAppNode = new iOSLaunchAppNode(commandRunner, logger);

  // Create Android deployment nodes
  const androidSelectEmulatorNode = new AndroidListDevicesNode(commandRunner, logger);
  const androidCreateEmulatorNode = new AndroidCreateEmulatorNode(commandRunner, logger);
  const androidStartEmulatorNode = new AndroidStartEmulatorNode(commandRunner, logger);
  const androidInstallAppNode = new AndroidInstallAppNode(commandRunner, logger);
  const androidLaunchAppNode = new AndroidLaunchAppNode(commandRunner, logger);

  // Create routers
  const checkProjectGenerationRouterInstance = new CheckProjectGenerationRouter(
    buildValidationNodeInstance.name,
    failureNode.name
  );

  const checkBuildSuccessfulRouterInstance = new CheckBuildSuccessfulRouter(
    deploymentNode.name,
    buildRecoveryNode.name,
    failureNode.name
  );

  const checkTemplatePropertiesFulfilledRouter = new CheckTemplatePropertiesFulfilledRouter(
    projectGenerationNode.name,
    templatePropertiesUserInputNode.name
  );

  const checkDeploymentPlatformRouterInstance = new CheckDeploymentPlatformRouter(
    iosSelectSimulatorNode.name,
    androidSelectEmulatorNode.name,
    failureNode.name
  );

  const checkEmulatorFoundRouter = new CheckEmulatorFoundRouter(
    androidStartEmulatorNode.name,
    androidCreateEmulatorNode.name
  );

  const checkEmulatorCreatedRouter = new CheckEmulatorCreatedRouter(
    androidStartEmulatorNode.name,
    failureNode.name
  );

  const checkEmulatorStartedRouter = new CheckEmulatorStartedRouter(
    androidInstallAppNode.name,
    failureNode.name
  );

  const checkAppInstalledRouter = new CheckAppInstalledRouter(
    androidLaunchAppNode.name,
    failureNode.name
  );

  return (
    new StateGraph(MobileNativeWorkflowState)
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
      .addNode(buildValidationNodeInstance.name, buildValidationNodeInstance.execute)
      .addNode(buildRecoveryNode.name, buildRecoveryNode.execute)
      .addNode(deploymentNode.name, deploymentNode.execute)
      // iOS deployment nodes
      .addNode(iosSelectSimulatorNode.name, iosSelectSimulatorNode.execute)
      .addNode(iosBootSimulatorNode.name, iosBootSimulatorNode.execute)
      .addNode(iosInstallAppNode.name, iosInstallAppNode.execute)
      .addNode(iosLaunchAppNode.name, iosLaunchAppNode.execute)
      // Android deployment nodes
      .addNode(androidSelectEmulatorNode.name, androidSelectEmulatorNode.execute)
      .addNode(androidCreateEmulatorNode.name, androidCreateEmulatorNode.execute)
      .addNode(androidStartEmulatorNode.name, androidStartEmulatorNode.execute)
      .addNode(androidInstallAppNode.name, androidInstallAppNode.execute)
      .addNode(androidLaunchAppNode.name, androidLaunchAppNode.execute)
      .addNode(completionNode.name, completionNode.execute)
      .addNode(failureNode.name, failureNode.execute)

      // Define workflow edges
      .addEdge(START, environmentValidationNode.name)
      .addConditionalEdges(environmentValidationNode.name, checkEnvironmentValidatedRouter.execute)
      .addConditionalEdges(
        initialUserInputExtractionNode.name,
        checkPropertiesFulFilledRouter.execute
      )
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
      .addConditionalEdges(projectGenerationNode.name, checkProjectGenerationRouterInstance.execute)
      // Build validation with recovery loop (similar to user input loop)
      .addConditionalEdges(
        buildValidationNodeInstance.name,
        checkBuildSuccessfulRouterInstance.execute
      )
      .addEdge(buildRecoveryNode.name, buildValidationNodeInstance.name)
      // Deployment flow - route based on platform
      .addConditionalEdges(deploymentNode.name, checkDeploymentPlatformRouterInstance.execute)
      // iOS deployment flow
      .addEdge(iosSelectSimulatorNode.name, iosBootSimulatorNode.name)
      .addEdge(iosBootSimulatorNode.name, iosInstallAppNode.name)
      .addEdge(iosInstallAppNode.name, iosLaunchAppNode.name)
      .addEdge(iosLaunchAppNode.name, completionNode.name)
      // Android deployment flow
      .addConditionalEdges(androidSelectEmulatorNode.name, checkEmulatorFoundRouter.execute)
      .addConditionalEdges(androidCreateEmulatorNode.name, checkEmulatorCreatedRouter.execute)
      .addConditionalEdges(androidStartEmulatorNode.name, checkEmulatorStartedRouter.execute)
      .addConditionalEdges(androidInstallAppNode.name, checkAppInstalledRouter.execute)
      .addEdge(androidLaunchAppNode.name, completionNode.name)
      // Completion and failure
      .addEdge(completionNode.name, END)
      .addEdge(failureNode.name, END)
  );
}
