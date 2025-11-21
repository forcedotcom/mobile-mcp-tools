/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { TEMPLATE_SELECTION_TOOL, TemplateSelectionWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

export class SFMobileNativeTemplateSelectionTool extends AbstractNativeProjectManagerTool<
  typeof TEMPLATE_SELECTION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, TEMPLATE_SELECTION_TOOL, 'TemplateSelectionTool', logger);
  }

  public handleRequest = async (input: TemplateSelectionWorkflowInput) => {
    try {
      const guidance = this.generateTemplateSelectionGuidance(input);

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

  private generateTemplateSelectionGuidance(input: TemplateSelectionWorkflowInput): string {
    const templateDetailsJson = JSON.stringify(input.templateDetails, null, 2);

    return dedent`
      # Template Selection Guidance for ${input.platform}

      ## Task: Select the Best Template

      The following detailed template information has been fetched for the candidates:

      \`\`\`json
      ${templateDetailsJson}
      \`\`\`

      Review the detailed information for each template candidate and choose the template that best matches:
      - **Platform compatibility**: ${input.platform}
      - **Feature requirements**: General mobile app needs
      - **Use case alignment**: Record management, data display, CRUD operations
      - **Complexity level**: Appropriate for the user's requirements

      Use the template path/name (the key in the templateDetails object) as the selectedTemplate value.
      \`\`\`
    `;
  }
}
