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
  targetDevice: z.string().optional().describe('Target device identifier (optional)')
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
      # Mobile Native App Deployment Guidance for ${input.platform}

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${this.generatePrerequisitesStep(1, input)}

      ${this.generateSimulatorReadyStep(2, input)}

      ${this.generateDeploymentStep(3, input)}
    `;
  }
  
  private generatePrerequisitesStep(stepNumber: number, input: DeploymentInput): string {
    return dedent`
      ## Step ${stepNumber}: Prerequisites Verification

      Before deployment, verify the following prerequisites:

      **1. Salesforce CLI Mobile Extension:**
      First verify the Salesforce CLI Mobile plugin is available and meets version requirments. ONLY run this command to verify the plugin is installed:
      
      \`\`\`bash
      sf plugins inspect @salesforce/lwc-dev-mobile --json
      \`\`\`
      
      ***Version Requirements:*** The plugin must be version 3.0.0-alpha.1 or greater.
      
      If the plugin is not installed, install it:
      
      \`\`\`bash
      sf plugins install @salesforce/lwc-dev-mobile
      \`\`\`
      
      If the plugin is installed but the version is less than 3.0.0-alpha.1, upgrade it:

      \`\`\`bash
      sf plugins update @salesforce/lwc-dev-mobile
      \`\`\`
      
      **2. Platform-Specific Requirements:**
      ${input.platform === 'iOS' ? this.getIOSPrerequisites() : this.getAndroidPrerequisites()}
    `;
  }

  private generateSimulatorReadyStep(step: number, input: DeploymentInput): string {
    const content = input.platform === 'iOS' ? 
    dedent`
      simulator
      \`\`\`bash
      xcrun simctl list
      \`\`\`
    ` : 
    dedent`
      emulator
      \`\`\`bash
    `;
    
    return dedent`
      ## Step ${step}: ${input.platform === 'iOS' ? 'Simulator' : 'Emulator'} must be ready

      Before deployment, verify the ${input.platform === 'iOS' ? 'simulator' : 'emulator'} is ready to run the app.

      ${content}
    `;
  }

  private getIOSPrerequisites(): string {
    return dedent`
      - **Xcode**: Must be installed and up-to-date
      - **iOS Simulator**: Available for testing
      - **Provisioning Profile**: Configured for your app
      - **Bundle Identifier**: Matches your provisioning profile
    `;
  }

  private getAndroidPrerequisites(): string {
    return dedent`
      - **Android Studio**: Must be installed with latest SDK
      - **Android SDK**: Platform tools and build tools installed
      - **Java Development Kit (JDK)**: Version 11 or higher
      - **Android Virtual Device (AVD)**: Available for testing
      - **Keystore**: Configured for release builds
    `;
  }

  private generateDeploymentStep(stepNumber: number, input: DeploymentInput): string {
    const platformLower = input.platform.toLowerCase();
    const deviceParam = input.targetDevice ? ` --target=${input.targetDevice}` : '';

    return dedent`
      ## Step ${stepNumber}: Deploy to Device/Simulator

      Deploy the built application using:

      \`\`\`bash
      ${this.generateDeploymentCommand(input)}
      \`\`\`

      **Deployment Parameters:**
      - **Project Path**: ${input.projectPath}
      - **Build Type**: ${input.buildType}
      ${input.targetDevice ? `- **Target Device**: ${input.targetDevice}` : '- **Target**: Default simulator/device'}

      **Platform-Specific Notes:**
      ${input.platform === 'iOS' ? this.getIOSDeploymentNotes() : this.getAndroidDeploymentNotes()}

      **Expected Behavior:**
      - Application should launch on the target device/simulator
      - Check for any deployment errors in the output
      - Verify the app starts successfully
    `;
  }

  private generateDeploymentCommand(input: DeploymentInput): string {
    if (input.platform === 'iOS') {
      // TODO: Get the correct simulator id
      return `xcrun simctl install booted /Users/ben.zhang/Library/Developer/Xcode/DerivedData/AppIosLogin-btyawyknzhtxhoadgzyjflvmphpv/Build/Products/Debug-iphonesimulator/AppIosLogin.app`
    } else {
      // TODO: tweak command for windows
      return `./gradlew install${input.buildType === 'debug' ? 'Debug' : 'Release'}`;
    }
  }

  private getIOSDeploymentNotes(): string {
    return dedent`
      - **Simulator**: Will launch in iOS Simulator if no device specified
      - **Device**: Must be connected via USB and trusted
      - **Code Signing**: Ensure proper provisioning profile is selected
      - **Bundle ID**: Must match your provisioning profile
    `;
  }

  private getAndroidDeploymentNotes(): string {
    return dedent`
      - **Emulator**: Will launch in Android Emulator if no device specified
      - **Device**: Must have USB debugging enabled and be authorized
      - **APK Installation**: App will be installed and launched automatically
      - **Permissions**: Grant necessary permissions when prompted
    `;
  }
}
