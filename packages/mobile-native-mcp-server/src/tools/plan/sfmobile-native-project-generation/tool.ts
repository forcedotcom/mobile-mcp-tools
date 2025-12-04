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

      ## Success Criteria

      ✅ Project generated successfully from template "${input.selectedTemplate}"
    `;
  }

  private generateStepExecuteCliCommand(
    stepNumber: number,
    input: ProjectGenerationWorkflowInput
  ): string {
    const platformLower = input.platform.toLowerCase();

    // Build template properties flags if they exist
    let templatePropertiesFlags = '';
    if (input.templateProperties && Object.keys(input.templateProperties).length > 0) {
      const propertyFlags = Object.entries(input.templateProperties)
        .map(([key, value]) => `--template-property-${key}="${value}"`)
        .join(' ');
      templatePropertiesFlags = ` ${propertyFlags}`;
    }

    return dedent`
      ## Step ${stepNumber}: Execute Platform-Specific CLI Command

      Generate the project using the Salesforce Mobile SDK CLI:

      \`\`\`bash
      sf mobilesdk ${platformLower} createwithtemplate --templatesource="${MOBILE_SDK_TEMPLATES_PATH}" --template="${input.selectedTemplate}" --appname="${input.projectName}" --packagename="${input.packageName}" --organization="${input.organization} --consumerkey="${input.connectedAppClientId}" --callbackurl="${input.connectedAppCallbackUri}" --loginserver="${input.loginHost} ${templatePropertiesFlags}"
      \`\`\`

      **Expected Outcome**: A new ${input.platform} project directory named "${input.projectName}" will be created with the template structure.

      NOTE: it is VERY IMPORTANT to use the above command EXACTLY to generate the project. Do not use any other configuration method to generate the project. If the above command fails do not try to generate the project using any other method. Instead report back error to the user.
    `;
  }
}
