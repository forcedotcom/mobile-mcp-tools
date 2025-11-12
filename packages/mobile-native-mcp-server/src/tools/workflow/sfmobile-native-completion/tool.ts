/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { FINISH_TOOL, FinishWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

export class SFMobileNativeCompletionTool extends AbstractNativeProjectManagerTool<
  typeof FINISH_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FINISH_TOOL, 'FinishTool', logger);
  }

  public handleRequest = async (input: FinishWorkflowInput) => {
    const guidance = this.generateWorkflowCompletionGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateWorkflowCompletionGuidance(input: FinishWorkflowInput) {
    return `
You are the tool that closes out the workflow. Let the user know that the workflow has
completed successfully, and tell them that they can find their project directory at
'${input.projectPath}'. Thank the user for participating in the workflow.
    `;
  }
}
