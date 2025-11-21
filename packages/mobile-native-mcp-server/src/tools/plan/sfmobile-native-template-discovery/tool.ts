/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
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
    const templateOptionsJson = JSON.stringify(input.templateOptions, null, 2);

    return dedent`
      # Template Discovery Guidance for ${input.platform}

      ## Task: Identify Promising Template Candidates

      The following template options have been discovered for ${input.platform}:

      \`\`\`json
      ${templateOptionsJson}
      \`\`\`

      Inspect the JSON above to identify templates that best match the user's requirements. Each template includes:
      - path: the relative path to the template from the templates source
      - description: the description of the template
      - features: the features of the template
      - useCase: the use case of the template
      - complexity: the complexity of the template
      - customizationPoints: the customization points of the template

      Filter the templates to the most promising candidates (typically 1-3 templates). Prioritize templates that match multiple keywords and have comprehensive documentation.

      Return a list of template paths/names as candidates. Use the template's \`path\` field from the JSON above as the candidate value.

      Return your result in this format:

      \`\`\`json
      {
        "templateCandidates": ["<TEMPLATE_PATH_1>", "<TEMPLATE_PATH_2>", ...]
      }
      \`\`\`

      You MUST return at least one candidate. Return multiple candidates if several templates seem equally promising.
    `;
  }
}
