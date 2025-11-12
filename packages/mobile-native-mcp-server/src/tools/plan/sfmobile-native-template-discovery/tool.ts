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
import { TEMPLATE_DISCOVERY_TOOL, TemplateDiscoveryWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

export class SFMobileNativeTemplateDiscoveryTool extends AbstractNativeProjectManagerTool<
  typeof TEMPLATE_DISCOVERY_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, TEMPLATE_DISCOVERY_TOOL, 'TemplateDiscoveryTool', logger);
  }

  public handleRequest = async (input: TemplateDiscoveryWorkflowInput) => {
    try {
      const guidance = this.generateTemplateDiscoveryGuidance(input);

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

  private generateTemplateDiscoveryGuidance(input: TemplateDiscoveryWorkflowInput): string {
    return dedent`
      # Template Discovery Guidance for ${input.platform}

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${this.generatePluginVerificationStep(1)}

      ${this.generateTemplateDiscoveryStep(2, input)}

      ${this.generateDetailedInvestigationStep(3, input)}
    `;
  }

  private generatePluginVerificationStep(stepNumber: number): string {
    return dedent`
      ## Step ${stepNumber}: Plugin Verification

      First, verify the Salesforce Mobile SDK plugin is available and meets version requirements. ONLY run this command to verify the plugin is installed:

      \`\`\`bash
      sf plugins inspect sfdx-mobilesdk-plugin --json
      \`\`\`

      **Version Requirements:** The plugin must be version 13.1.0 or greater.

      If the plugin is not installed, install it:

      \`\`\`bash
      sf plugins install sfdx-mobilesdk-plugin
      \`\`\`

      If the plugin is installed but the version is less than 13.1.0, upgrade it:

      \`\`\`bash
      sf plugins update sfdx-mobilesdk-plugin
      \`\`\`

      Verify the updated version meets requirements before proceeding to template discovery.
    `;
  }

  private generateTemplateDiscoveryStep(
    stepNumber: number,
    input: TemplateDiscoveryWorkflowInput
  ): string {
    const platformLower = input.platform.toLowerCase();

    return dedent`
      ## Step ${stepNumber}: Template Discovery

      Discover available ${input.platform} templates using:

      \`\`\`bash
      sf mobilesdk ${platformLower} listtemplates --templatesource=${MOBILE_SDK_TEMPLATES_PATH} --doc --json
      \`\`\`

      You MUST use the --templatesource=${MOBILE_SDK_TEMPLATES_PATH} flag to specify the templates source, do not use any other source.

      This will show a detailed JSON representation of all available templates with their:
      - path: the relative path to the template from the templates source
      - description: the description of the template
      - features: the features of the template
      - useCase: the use case of the template
      - complexity: the complexity of the template
      - customizationPoints: the customization points of the template

      Inspect the JSON output from the template discovery command to identify templates that best match the user's requirements and filter the templates to the most promising candidates. Prioritize templates that match multiple keywords and have comprehensive documentation.
    `;
  }

  private generateDetailedInvestigationStep(
    stepNumber: number,
    input: TemplateDiscoveryWorkflowInput
  ): string {
    const platformLower = input.platform.toLowerCase();

    return dedent`
      ## Step ${stepNumber}: Detailed Template Investigation

      For each promising template, get detailed documentation:

      \`\`\`bash
      sf mobilesdk ${platformLower} describetemplate --templatesource=${MOBILE_SDK_TEMPLATES_PATH} --template=<TEMPLATE_PATH> --doc --json
      \`\`\`

       Choose the template that best matches:
      - **Platform compatibility**: ${input.platform}
      - **Feature requirements**: General mobile app needs
      - **Use case alignment**: Record management, data display, CRUD operations
      - **Complexity level**: Appropriate for the user's requirements
    `;
  }
}
