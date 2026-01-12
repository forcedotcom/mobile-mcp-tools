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
import { BuildExecutor } from '../execution/build/buildExecutor.js';
import { BuildRecoveryNode } from './nodes/buildRecovery.js';
import { CheckBuildSuccessfulRouter } from './nodes/checkBuildSuccessfulRouter.js';
import { DeploymentNode } from './nodes/deploymentNode.js';
import { CompletionNode } from './nodes/completionNode.js';
import { FailureNode } from './nodes/failureNode.js';
import { TempDirectoryManager } from '../common.js';
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
import { CheckSimulatorRunningRouter } from './nodes/checkSimulatorRunningRouter.js';
import {
  createGetUserInputNode,
  createUserInputExtractionNode,
  CheckPropertiesFulfilledRouter,
  CommandRunner,
} from '@salesforce/magen-mcp-workflow';
import {
  iOSSelectSimulatorNode,
  iOSLaunchSimulatorAppNode,
  iOSCheckSimulatorStatusNode,
  iOSBootSimulatorNode,
  iOSInstallAppNode,
  iOSLaunchAppNode,
  AndroidListDevicesNode,
  AndroidCreateEmulatorNode,
  AndroidStartEmulatorNode,
  AndroidInstallAppNode,
  AndroidLaunchAppNode,
} from './nodes/deployment/index.js';
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

// Note: checkTemplatePropertiesFulfilledRouter references projectGenerationNode.name
// which will be resolved at runtime when createMobileNativeWorkflow is called
const checkTemplatePropertiesFulfilledRouter = new CheckTemplatePropertiesFulfilledRouter(
  'generateProject', // Use the node name string directly since it's constant
  templatePropertiesUserInputNode.name
);

/**
 * Creates the mobile native workflow graph with injected dependencies.
 *
 * @param buildExecutor - Build executor for executing builds with progress reporting
 * @param commandRunner - Command runner for executing commands with progress reporting
 * @param tempDirManager - Temporary directory manager for build artifacts
 * @returns Configured workflow graph
 */
export function createMobileNativeWorkflow(
  buildExecutor: BuildExecutor,
  commandRunner: CommandRunner,
  tempDirManager: TempDirectoryManager
) {
  // Create project generation node with CommandRunner
  const projectGenerationNodeInstance = new ProjectGenerationNode(commandRunner);

  // Create build validation node with BuildExecutor
  const buildValidationNodeInstance = new BuildValidationNode(buildExecutor);

  // Create iOS deployment nodes
  const iosSelectSimulatorNode = new iOSSelectSimulatorNode(commandRunner);
  const iosLaunchSimulatorAppNode = new iOSLaunchSimulatorAppNode(commandRunner);
  const iosCheckSimulatorStatusNode = new iOSCheckSimulatorStatusNode(commandRunner);
  const iosBootSimulatorNode = new iOSBootSimulatorNode(commandRunner);
  const iosInstallAppNode = new iOSInstallAppNode(commandRunner, tempDirManager);
  const iosLaunchAppNode = new iOSLaunchAppNode(commandRunner);

  // Create Android deployment nodes
  const androidListDevicesNode = new AndroidListDevicesNode(commandRunner);
  const androidCreateEmulatorNode = new AndroidCreateEmulatorNode(commandRunner);
  const androidStartEmulatorNode = new AndroidStartEmulatorNode(commandRunner);
  const androidInstallAppNode = new AndroidInstallAppNode(commandRunner);
  const androidLaunchAppNode = new AndroidLaunchAppNode(commandRunner);

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

  const checkDeploymentPlatformRouterInstance = new CheckDeploymentPlatformRouter(
    iosSelectSimulatorNode.name,
    androidListDevicesNode.name,
    failureNode.name
  );

  const checkSimulatorRunningRouterInstance = new CheckSimulatorRunningRouter(
    iosBootSimulatorNode.name,
    iosInstallAppNode.name
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
      .addNode(projectGenerationNodeInstance.name, projectGenerationNodeInstance.execute)
      .addNode(buildValidationNodeInstance.name, buildValidationNodeInstance.execute)
      .addNode(buildRecoveryNode.name, buildRecoveryNode.execute)
      .addNode(deploymentNode.name, deploymentNode.execute)
      // iOS deployment nodes
      .addNode(iosSelectSimulatorNode.name, iosSelectSimulatorNode.execute)
      .addNode(iosLaunchSimulatorAppNode.name, iosLaunchSimulatorAppNode.execute)
      .addNode(iosCheckSimulatorStatusNode.name, iosCheckSimulatorStatusNode.execute)
      .addNode(iosBootSimulatorNode.name, iosBootSimulatorNode.execute)
      .addNode(iosInstallAppNode.name, iosInstallAppNode.execute)
      .addNode(iosLaunchAppNode.name, iosLaunchAppNode.execute)
      // Android deployment nodes
      .addNode(androidListDevicesNode.name, androidListDevicesNode.execute)
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
      .addConditionalEdges(
        projectGenerationNodeInstance.name,
        checkProjectGenerationRouterInstance.execute
      )
      // Build validation with recovery loop (similar to user input loop)
      .addConditionalEdges(
        buildValidationNodeInstance.name,
        checkBuildSuccessfulRouterInstance.execute
      )
      .addEdge(buildRecoveryNode.name, buildValidationNodeInstance.name)
      // Deployment flow - route based on platform
      .addConditionalEdges(deploymentNode.name, checkDeploymentPlatformRouterInstance.execute)
      // iOS deployment flow
      .addEdge(iosSelectSimulatorNode.name, iosLaunchSimulatorAppNode.name)
      .addEdge(iosLaunchSimulatorAppNode.name, iosCheckSimulatorStatusNode.name)
      .addConditionalEdges(
        iosCheckSimulatorStatusNode.name,
        checkSimulatorRunningRouterInstance.execute
      )
      .addEdge(iosBootSimulatorNode.name, iosInstallAppNode.name)
      .addEdge(iosInstallAppNode.name, iosLaunchAppNode.name)
      .addEdge(iosLaunchAppNode.name, completionNode.name)
      // Android deployment flow
      .addEdge(androidListDevicesNode.name, androidCreateEmulatorNode.name)
      .addEdge(androidCreateEmulatorNode.name, androidStartEmulatorNode.name)
      .addEdge(androidStartEmulatorNode.name, androidInstallAppNode.name)
      .addEdge(androidInstallAppNode.name, androidLaunchAppNode.name)
      .addEdge(androidLaunchAppNode.name, completionNode.name)
      // Completion and failure
      .addEdge(completionNode.name, END)
      .addEdge(failureNode.name, END)
  );
}
