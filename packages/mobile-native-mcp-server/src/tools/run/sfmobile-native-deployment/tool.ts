/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dedent from 'dedent';
import { Tool } from '../../tool.js';

// Input schema for the deployment tool
const DeploymentInputSchema = z.object({
  platform: z.enum(['iOS', 'Android']).describe('Target mobile platform'),
  projectPath: z.string().describe('Path to the mobile project directory'),
  buildType: z.enum(['debug', 'release']).default('debug').describe('Build type for deployment'),
  targetDevice: z.string().optional().describe('Target device identifier (optional)'),
});

type DeploymentInput = z.infer<typeof DeploymentInputSchema>;

export class SfmobileNativeDeploymentTool implements Tool {
  public readonly name = 'Salesforce Mobile Native Deployment';
  public readonly title = 'Salesforce Mobile Native Deployment Guide';
  public readonly toolId = 'sfmobile-native-deployment';
  public readonly description =
    'Guides LLM through deploying Salesforce mobile native apps to devices or simulators';
  public readonly inputSchema = DeploymentInputSchema;

  public register(server: McpServer, annotations: ToolAnnotations): void {
    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
    };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }

  private async handleRequest(input: DeploymentInput) {
    try {
      // Parse the input to ensure defaults are applied
      const parsedInput = this.inputSchema.parse(input);
      const guidance = this.generateDeploymentGuidance(parsedInput);

      return {
        content: [
          {
            type: 'text' as const,
            text: guidance,
          },
        ],
      };
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
  }

  private generateDeploymentGuidance(input: DeploymentInput): string {
    return dedent`
      You are a technology-adept agent working on behalf of a user who has less familiarity with the technical details of application deployment than you do, and needs your assistance to deploy the app to the target device.
      Please execute the instructions of the following plan on behalf of the user, providing them information on the outcomes that they may need to know.

      # Mobile Native App Deployment Guidance for ${input.platform}

      First make sure \`sfmobile-native-build\` mcp tool is executed successfully. If not, run the \`sfmobile-native-build\` tool first.

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${this.generateTargetDeviceReadyStep(1, input)}

      ${this.generateDeploymentStep(2, input)}

      ${this.generateNextStep(input)}
      `;
  }

  private generateNextStep(input: DeploymentInput): string {
    return dedent`
      ## Next Steps

      Once the app is deployed successfully, you can launch the app on the target device by running the following command:
      ${this.generateLaunchCommand(input)}
    `;
  }
  
  private generateLaunchCommand(input: DeploymentInput): string {
      return input.platform === 'iOS' ? 
        dedent`
          \`\`\`bash
          xcrun simctl launch ${input.targetDevice} <app-bundle-id>
          \`\`\`
          Replace <app-bundle-id> with the bundle id of the app.
        `:
        dedent`
          \`\`\`bash
          adb shell am start -n <app-package-name>/<app-activity-name>
          \`\`\`
        `;
  }

  private generateTargetDeviceReadyStep(stepNumber: number, input: DeploymentInput): string {
    return dedent`
      ## Step ${stepNumber}: ${input.platform === 'iOS' ? 'iOS Simulator' : 'Android Emulator'} must be ready
      
      ${input.platform === 'iOS' ? 
        this.generateTargetDeviceReadyStepIOS(input): 
        this.generateTargetDeviceReadyStepAdndroid(input)
      }
    `;
  }

  private generateTargetDeviceReadyStepIOS(input: DeploymentInput): string {
    return dedent`
      Navigate to the ${input.projectPath} directory and run the following command to check if the simulator is running:

      \`\`\`bash
      xcrun simctl list devices | grep "${input.targetDevice}"
      \`\`\`

      If (Shutdown) is shown as the output, the simulator is not running. Start it by running the following command:

      \`\`\`bash
      xcrun simctl boot ${input.targetDevice}
      \`\`\`
    `;
  }

  private generateTargetDeviceReadyStepAdndroid(input: DeploymentInput): string {
    //TODO: implement android emulator ready step
    return dedent`
      Navigate to the ${input.projectPath} directory and run the following command to check if the simulator is running:

    `;
  }

  private generateDeploymentStep(stepNumber: number, input: DeploymentInput): string {

    return dedent`
      ## Step ${stepNumber}: Deploy application to ${input.platform === 'iOS' ? 'iOS Simulator' : 'Android Emulator'}

      Deploy the application to the target device using:

      \`\`\`bash
      ${this.generateDeploymentCommand(input)}
      \`\`\`
    `;
  }

  private generateDeploymentCommand(input: DeploymentInput): string {
    if (input.platform === 'iOS') {
      // TODO: Get the correct simulator id
      return dedent`
        \`\`\`bash
        xcrun simctl install ${input.targetDevice} <your-app>.app
        \`\`\`

        Replace <your-app>.app with app name built in \`sfmobile-native-build\` tool call.
      `;
    } else {
      // TODO: tweak command for windows
      return `./gradlew install${input.buildType === 'debug' ? 'Debug' : 'Release'}`;
    }
  }
}
