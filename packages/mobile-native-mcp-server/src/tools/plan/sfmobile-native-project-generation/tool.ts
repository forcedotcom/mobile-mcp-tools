/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../../common.js';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { PROJECT_GENERATION_TOOL, ProjectGenerationWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

export class SFMobileNativeProjectGenerationTool extends AbstractNativeProjectManagerTool<
  typeof PROJECT_GENERATION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, PROJECT_GENERATION_TOOL, 'ProjectGenerationTool', logger);
  }

  public handleRequest = async (input: ProjectGenerationWorkflowInput) => {
    try {
      const guidance = this.generateProjectGenerationGuidance(input);
      return this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
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

  private generateProjectGenerationGuidance(input: ProjectGenerationWorkflowInput): string {
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
    `;
  }

  private generateStepExecuteCliCommand(
    stepNumber: number,
    input: ProjectGenerationWorkflowInput
  ): string {
    const platformLower = input.platform.toLowerCase();

    return dedent`
      ## Step ${stepNumber}: Execute Platform-Specific CLI Command

      Generate the project using the Salesforce Mobile SDK CLI:

      \`\`\`bash
      sf mobilesdk ${platformLower} createwithtemplate --templatesource="${MOBILE_SDK_TEMPLATES_PATH}" --template="${input.selectedTemplate}" --appname="${input.projectName}" --packagename="${input.packageName}" --organization="${input.organization}"
      \`\`\`

      **Expected Outcome**: A new ${input.platform} project directory named "${input.projectName}" will be created with the template structure. The output of the command will indicate the location of the bootconfig.plist file, take note of this for oauth configuration!

      NOTE: it is VERY IMPORTANT to use the above command EXACTLY to generate the project. Do not use any other configuration method to generate the project. If the above command fails do not try to generate the project using any other method. Instead report back error to the user.
    `;
  }

  private generateStepVerifyProjectStructure(
    stepNumber: number,
    input: ProjectGenerationWorkflowInput
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

  private generateStepConfigureOAuth(
    stepNumber: number,
    input: ProjectGenerationWorkflowInput
  ): string {
    const { connectedAppClientId, connectedAppCallbackUri, loginHost } = input;

    return dedent`
      ## Step ${stepNumber}: Configure OAuth Settings

      ### Locate OAuth Configuration Files

      Find and modify the OAuth configuration files in your generated project. The location of this file was provided when the project was generated.

      ${
        input.platform === 'iOS'
          ? dedent`
        **For iOS:**

        **File Name**: \`bootconfig.plist\`

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
                <string>id</string>
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

        **Expected File Name**: bootconfig.xml.

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
