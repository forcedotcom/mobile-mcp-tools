/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { DEPLOYMENT_TOOL, DeploymentWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';
import { TempDirectoryManager, defaultTempDirectoryManager } from '../../../common.js';

export class SFMobileNativeDeploymentTool extends AbstractNativeProjectManagerTool<
  typeof DEPLOYMENT_TOOL
> {
  private readonly tempDirManager: TempDirectoryManager;

  constructor(
    server: McpServer,
    tempDirManager: TempDirectoryManager = defaultTempDirectoryManager,
    logger?: Logger
  ) {
    super(server, DEPLOYMENT_TOOL, 'DeploymentTool', logger);
    this.tempDirManager = tempDirManager;
  }

  public handleRequest = async (input: DeploymentWorkflowInput) => {
    try {
      // Parsing here is about setting defaults from the input schema (e.g. buildType default).
      const validatedInput = this.toolMetadata.inputSchema.parse(input);

      // TODO: This hard-coded "default" device is just a placeholder for work that we need
      // to do to uplift this UX. Coming soon, we'll have proper CLI tools for managing our
      // virtual device flows, and when we do, we'll want to reconsider how we handle the UX
      // of the user selection of virtual devices more generally. In the meantime, this just
      // helps the LLM to not have to typically "vibe" a default value in all use cases, since
      // we don't really take in a virtual device at this point.
      validatedInput.targetDevice = validatedInput.targetDevice ?? 'iPhone 16 Pro Max';

      const guidance = this.generateDeploymentGuidance(validatedInput);
      return this.finalizeWorkflowToolOutput(guidance, validatedInput.workflowStateData);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
      };
    }
  };

  private generateDeploymentGuidance(input: DeploymentWorkflowInput): string {
    return dedent`
      You are a technology-adept agent working on behalf of a user who has less familiarity with the technical details of application deployment than you do, and needs your assistance to deploy the app to the target device.
      Please execute the instructions of the following plan on behalf of the user, providing them information on the outcomes that they may need to know.

      # Mobile Native App Deployment Guidance for ${input.platform}

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${this.generateTargetDeviceReadyStep(1, input)}

      ${this.generateDeploymentStep(2, input)}

      ${this.generateNextStep(input)}
    `;
  }

  private generateTargetDeviceReadyStep(
    stepNumber: number,
    input: DeploymentWorkflowInput
  ): string {
    return dedent`
      ## Step ${stepNumber}: ${input.platform === 'iOS' ? 'iOS Simulator' : 'Android Emulator'} must be ready
      
      ${
        input.platform === 'iOS'
          ? this.generateTargetDeviceReadyStepIOS(input)
          : this.generateTargetDeviceReadyStepAndroid(input)
      }
    `;
  }

  private generateTargetDeviceReadyStepIOS(input: DeploymentWorkflowInput): string {
    return dedent`
      ### Launch the macOS Simulator app
      If the macOS Simulator app is not running on the macOS host, we will not be able to proceed
      with the deployment commands. The easiest way to ensure that the Simulator app is
      running is to run:

      \`\`\`bash
      open -a Simulator
      \`\`\`

      ### Check to see if our targeted simulator is running
      Run the following command to check if the simulator is running:

      \`\`\`bash
      xcrun simctl list devices | grep "${input.targetDevice}"
      \`\`\`

      If (Shutdown) is shown as the output, the simulator is not running. Start it by running the following command:

      \`\`\`bash
      xcrun simctl boot "${input.targetDevice}"
      \`\`\`
    `;
  }

  private generateTargetDeviceReadyStepAndroid(input: DeploymentWorkflowInput): string {
    return dedent`
      Navigate to the ${input.projectPath} directory and run the following commands to make sure 
      an emulator with an API level equal to or higher than the app's minimum SDK version is active.

      First, make sure an emulator is configured. If not, run the following command to create a new emulator:
      \`\`\`bash
      sf force lightning local device list -p android
      \`\`\`

      If an emulator hasn't been set up yet, use the following command to create one:
      \`\`\`bash
      sf force lightning local device create -p android -n pixel-<api-level> -d pixel -l <api-level>
      \`\`\`

      Replace <api-level> with the value of minSdk from the application's build gradle file.

      Second, get the emulator to use by running the following command:
      \`\`\`bash
      sf force lightning local device list -p android
      \`\`\`
      
      Third, start the emulator by running the following command:
      \`\`\`bash
      sf force lightning local device start -p android -t <emulator-name>
      \`\`\`
    `;
  }

  private generateDeploymentStep(stepNumber: number, input: DeploymentWorkflowInput): string {
    return dedent`
      ## Step ${stepNumber}: Deploy application to ${input.platform === 'iOS' ? 'iOS Simulator' : 'Android Emulator'}

      Deploy the application to the target device using:

      \`\`\`bash
      ${this.generateDeploymentCommand(input)}
      \`\`\`
    `;
  }

  private generateDeploymentCommand(input: DeploymentWorkflowInput): string {
    return input.platform === 'iOS'
      ? dedent`
        \`\`\`bash
        xcrun simctl install "${input.targetDevice}" "${this.tempDirManager.getAppArtifactPath(input.projectName, 'iOS')}"
        \`\`\`

      `
      : dedent`
        \`\`\`bash
        ./gradlew install${input.buildType === 'release' ? 'Release' : 'Debug'}
        \`\`\`
      `;
  }

  private generateNextStep(input: DeploymentWorkflowInput): string {
    return dedent`
      ## Next Steps

      Once the app is deployed successfully, you MUST launch the app on the target device by running the following command:
      ${this.generateLaunchCommand(input)}
    `;
  }

  private generateLaunchCommand(input: DeploymentWorkflowInput): string {
    return input.platform === 'iOS'
      ? dedent`
        \`\`\`bash
        xcrun simctl launch "${input.targetDevice}" "${input.packageName}.${input.projectName}"
        \`\`\`
      `
      : dedent`
        \`\`\`bash
        adb shell monkey -p <application-id> -c android.intent.category.LAUNCHER 1
        \`\`\`
        Replace <application-id> with the value of applicationId from the application's build gradle file.
      `;
  }
}
