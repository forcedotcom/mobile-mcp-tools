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
import { MOBILE_SDK_TEMPLATES_PATH } from '../../../constants.js';

// Input schema for the project generation tool
const ProjectGenerationInputSchema = z.object({
  selectedTemplate: z.string().describe('The template ID selected from template discovery'),
  projectName: z.string().describe('Name for the mobile app project'),
  platform: z.enum(['iOS', 'Android']).describe('Target mobile platform'),
  packageName: z.string().describe('Package name for the mobile app (e.g., com.company.appname)'),
  organization: z.string().describe('Organization name for the mobile app project'),
  connectedAppClientId: z.string().describe('Connected App Client ID for OAuth configuration'),
  connectedAppCallbackUri: z
    .string()
    .describe('Connected App Callback URI for OAuth configuration'),
  loginHost: z
    .string()
    .optional()
    .describe('Optional Salesforce login host URL (e.g., https://test.salesforce.com for sandbox)'),
});

type ProjectGenerationInput = z.infer<typeof ProjectGenerationInputSchema>;

export class SfmobileNativeProjectGenerationTool implements Tool {
  public readonly name = 'Salesforce Mobile Native Project Generation';
  public readonly title = 'Salesforce Mobile Native Project Generation Guide';
  public readonly toolId = 'sfmobile-native-project-generation';
  public readonly description =
    'Provides LLM instructions for generating a mobile app project from a selected template with OAuth configuration';
  public readonly inputSchema = ProjectGenerationInputSchema;

  public register(server: McpServer, annotations: ToolAnnotations): void {
    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
      readOnlyHint: false, // Project generation modifies file system
      destructiveHint: false, // Creates new projects but doesn't destroy existing files
      idempotentHint: false, // Project creation modifies file system state
      openWorldHint: true, // Interacts with CLI tools and file system
    };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }

  private async handleRequest(input: ProjectGenerationInput) {
    try {
      const guidance = this.generateProjectGenerationGuidance(input);

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

  private generateProjectGenerationGuidance(input: ProjectGenerationInput): string {
    return dedent`
      # Mobile App Project Generation Guide

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ## Project Configuration
      - **Template**: ${input.selectedTemplate}
      - **Project Name**: ${input.projectName}
      - **Platform**: ${input.platform}
      - **Package Name**: ${input.packageName}
      - **Organization**: ${input.organization}
      - **Login Host**: ${input.loginHost || 'Default (production)'}

      ${this.generateStepExecuteCliCommand(1, input)}

      ${this.generateStepVerifyProjectStructure(2, input)}

      ${this.generateStepConfigureOAuth(3, input)}

      ## Success Criteria

      ✅ Project generated successfully from template "${input.selectedTemplate}"
      ✅ Project structure verified
      ✅ OAuth configuration completed with provided credentials
      ✅ Ready for build validation using the sfmobile-native-build-validation tool

      Once the project is successfully generated and OAuth is configured, proceed to the next stage:

      **Use the sfmobile-native-build-validation tool** to validate that the project builds successfully and is ready for development. 
      
      VERY IMPORTANT:If this tool is not available, DO NOT proceed to the next stage. Instead report back to the user with next steps.

    `;
  }

  private generateStepExecuteCliCommand(stepNumber: number, input: ProjectGenerationInput): string {
    const platformLower = input.platform.toLowerCase();

    return dedent`
      ## Step ${stepNumber}: Execute Platform-Specific CLI Command

      Generate the project using the Salesforce Mobile SDK CLI:

      \`\`\`bash
      sf mobilesdk ${platformLower} createwithtemplate --templatesource="${MOBILE_SDK_TEMPLATES_PATH}" --template="${input.selectedTemplate}" --appname="${input.projectName}" --packagename="${input.packageName}" --organization="${input.organization}"
      \`\`\`

      **Expected Outcome**: A new ${input.platform} project directory named "${input.projectName}" will be created with the template structure.

      NOTE: it is VERY IMPORTANT to use the above command EXACTLY to generate the project. Do not use any other configuration method to generate the project. If the above command fails do not try to generate the project using any other method. Instead report back error to the user.
    `;
  }

  private generateStepVerifyProjectStructure(
    stepNumber: number,
    input: ProjectGenerationInput
  ): string {
    return dedent`
      ## Step ${stepNumber}: Verify Project Structure

      Navigate to the project directory and verify the basic structure:

      \`\`\`bash
      cd "${input.projectName}"
      ls -la
      \`\`\`

      **Expected Structure**: You should see platform-specific files and directories appropriate for ${input.platform} development.
    `;
  }

  private generateStepConfigureOAuth(stepNumber: number, input: ProjectGenerationInput): string {
    const { connectedAppClientId, connectedAppCallbackUri, loginHost } = input;

    return dedent`
      ## Step ${stepNumber}: Configure OAuth Settings

      ### Locate OAuth Configuration Files

      Find and modify the OAuth configuration files in your generated project:

      ${
        input.platform === 'iOS'
          ? dedent`
        **For iOS:**

        **Expected Location**: \`${input.projectName}/${input.projectName}/Resources/bootconfig.plist\`

        ### Update iOS OAuth Configuration

        Edit the \`bootconfig.plist\` file:

        \`\`\`xml
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
            "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
            <key>remoteAccessConsumerKey</key>
            <string>${connectedAppClientId}</string>
            <key>oauthRedirectURI</key>
            <string>${connectedAppCallbackUri}</string>
            <key>oauthScopes</key>
            <array>
                <string>web</string>
                <string>api</string>
            </array>
            <key>shouldAuthenticate</key>
            <true/>
        </dict>
        </plist>
        \`\`\`

        ### Update iOS URL Scheme

        Edit the \`Info.plist\` file to add the custom URL scheme:

        \`\`\`xml
        <key>CFBundleURLTypes</key>
        <array>
            <dict>
                <key>CFBundleURLName</key>
                <string>com.salesforce.oauth</string>
                <key>CFBundleURLSchemes</key>
                <array>
                    <string>${connectedAppCallbackUri?.split('://')[0] || 'myapp'}</string>
                </array>
            </dict>
        </array>
        \`\`\`${
          loginHost
            ? dedent`

        ### Update iOS Login Host

        Edit the \`${input.projectName}/${input.projectName}/Info.plist\` file to add the custom login host:

        \`\`\`xml
        <key>SFDCOAuthLoginHost</key>
        <string>${loginHost}</string>
        \`\`\`
        `
            : ''
        }
      `
          : dedent`
        **For Android:**
        \`\`\`bash
        # Locate the bootconfig.xml file
        find . -name "bootconfig.xml" -type f
        \`\`\`

        **Expected Location**: Usually in \`app/src/main/res/values/bootconfig.xml\` or similar path.

        ### Update Android OAuth Configuration

        Edit the \`bootconfig.xml\` file:

        \`\`\`xml
        <string name="remoteAccessConsumerKey">${connectedAppClientId}</string>
        <string name="oauthRedirectURI">${connectedAppCallbackUri}</string>${loginHost ? `\n        <string name="oauthLoginDomain">${loginHost}</string>` : ''}
        \`\`\`

        ### Update Android Manifest

        Edit the \`AndroidManifest.xml\` file to add the intent filter:

        \`\`\`xml
        <activity android:name="com.salesforce.androidsdk.auth.LoginActivity">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${connectedAppCallbackUri?.split('://')[0] || 'myapp'}" />
            </intent-filter>
        </activity>
        \`\`\`
      `
      }

      ### Verify OAuth Configuration

      After updating the configuration files, verify the changes:

      \`\`\`bash
      # Check that the files contain your credentials
      grep -r "${connectedAppClientId?.substring(0, 10) || 'CLIENT_ID'}" .
      grep -r "${connectedAppCallbackUri?.split('://')[0] || 'CALLBACK'}" .
      \`\`\`

      **Expected Outcome**: Your OAuth credentials should be found in the configuration files.
    `;
  }
}
