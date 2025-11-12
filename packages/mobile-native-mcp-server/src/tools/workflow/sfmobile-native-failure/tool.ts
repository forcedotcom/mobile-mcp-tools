/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { FAILURE_TOOL, FailureWorkflowInput } from './metadata.js';
import { AbstractWorkflowTool } from '@salesforce/magen-mcp-workflow';

export class SFMobileNativeFailureTool extends AbstractWorkflowTool<typeof FAILURE_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FAILURE_TOOL, 'sfmobile-native-project-manager', 'FailureTool', logger);
  }

  public handleRequest = async (input: FailureWorkflowInput) => {
    const guidance = this.generateWorkflowFailureGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateWorkflowFailureGuidance(input: FailureWorkflowInput) {
    return `
# ROLE
You are the tool that describes a failure of the workflow to the user.

# TASK
Your task is to describe the failure of the workflow to the user, along with supporting
evidence in the way of specific failure messages.

# CONTEXT
The following is the list of failure messages associated with the workflow failure:

${this.makeFailureMessageList(input.messages)}

# INSTRUCTIONS
1. Describe the failure of the workflow to the user, along with supporting
   evidence in the way of specific failure messages.
2. Do not add any extra conversation or pleasantries. Just describe the failure.
3. **NOTE:** These failures are non-recoverable. You should not spend time trying to fix
   them with the user. Simply describe and explain the failure(s) to the user, and advise them
   to fix the issues.
4. Continue with the completion of theworkflow, based on the instructions below.
    `;
  }

  private makeFailureMessageList(messages: string[]): string {
    return messages.map(message => `- ${message}`).join('\n');
  }
}
