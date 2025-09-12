/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AbstractTool } from '../../base/abstractTool.js';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../../constants.js';
import { WORKFLOW_TOOL_BASE_INPUT_SCHEMA } from '../../../workflow/schemas.js';
import { Logger } from '../../../logging/index.js';
import { TEMPLATE_DISCOVERY_TOOL } from '../../../registry/toolRegistry.js';
import { type TemplateDiscoveryInput } from '../../../schemas/toolSchemas.js';
import dedent from 'dedent';

// Extend the centralized schema with workflow support
const TemplateDiscoveryInputSchema = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend(
  TEMPLATE_DISCOVERY_TOOL.inputSchema.shape
);

type ExtendedTemplateDiscoveryInput = z.infer<typeof TemplateDiscoveryInputSchema>;

export class SfmobileNativeTemplateDiscoveryTool extends AbstractTool {
  public readonly toolId = TEMPLATE_DISCOVERY_TOOL.toolId;
  public readonly name = TEMPLATE_DISCOVERY_TOOL.name;
  public readonly title = TEMPLATE_DISCOVERY_TOOL.title;
  public readonly description = TEMPLATE_DISCOVERY_TOOL.description;
  public readonly inputSchema = TemplateDiscoveryInputSchema;
  public readonly outputSchema = undefined; // No specific output schema defined

  constructor(server: McpServer, logger?: Logger) {
    super(server, 'TemplateDiscoveryTool', logger);
  }

  protected async handleRequest(input: ExtendedTemplateDiscoveryInput) {
    try {
      const guidance = this.generateTemplateDiscoveryGuidance(input);

      // Add workflow round-tripping instructions if this is part of a workflow
      const finalOutput = input.workflowStateData
        ? this.addPostInvocationInstructions(
            guidance,
            'the complete template discovery results and selected template information',
            input.workflowStateData
          )
        : guidance;

      return {
        content: [
          {
            type: 'text' as const,
            text: finalOutput,
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

  private generateTemplateDiscoveryGuidance(input: TemplateDiscoveryInput): string {
    return dedent`
      # Template Discovery Guidance for ${input.platform}

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${this.generatePluginVerificationStep(1)}

      ${this.generateTemplateDiscoveryStep(2, input)}

      ${this.generateDetailedInvestigationStep(3, input)}

      ${this.generateNextStepsSection()}
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

  private generateTemplateDiscoveryStep(stepNumber: number, input: TemplateDiscoveryInput): string {
    const platformLower = input.platform.toLowerCase();

    return dedent`
      ## Step ${stepNumber}: Template Discovery

      Discover available ${input.platform} templates using:

      \`\`\`bash
      sf mobilesdk ${platformLower} listtemplates --templatesource=${MOBILE_SDK_TEMPLATES_PATH} --doc --json
      \`\`\`

      You MUST use the --templatesource=${MOBILE_SDK_TEMPLATES_PATH} flag to specify the templates source, do not use any other source.

      This will show all available templates with their:
      - Template ID
      - Description
      - Features
      - Use cases

      Inspect the JSON output from the template discovery command to identify templates that best match the user's requirements and filter the templates to the most promising candidates. Prioritize templates that match multiple keywords and have comprehensive documentation.
    `;
  }

  private generateDetailedInvestigationStep(
    stepNumber: number,
    input: TemplateDiscoveryInput
  ): string {
    const platformLower = input.platform.toLowerCase();

    return dedent`
      ## Step ${stepNumber}: Detailed Template Investigation

      For each promising template, get detailed documentation:

      \`\`\`bash
      sf mobilesdk ${platformLower} describetemplate --templatesource=${MOBILE_SDK_TEMPLATES_PATH} --template=<templateId> --doc --json
      \`\`\`

       Choose the template that best matches:
      - **Platform compatibility**: ${input.platform}
      - **Feature requirements**: General mobile app needs
      - **Use case alignment**: Record management, data display, CRUD operations
      - **Complexity level**: Appropriate for the user's requirements
    `;
  }

  private generateNextStepsSection(): string {
    return dedent`
      ## Next Steps

      Once you've identified the best template:
      1. Note the selected template ID
      2. Proceed to project generation using \`sfmobile-native-project-generation\`
    `;
  }
}
