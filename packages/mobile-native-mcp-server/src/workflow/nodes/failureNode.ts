/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';
import { AbstractToolNode } from '@salesforce/magen-mcp-workflow';
import { ToolExecutor } from '@salesforce/magen-mcp-workflow';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { FAILURE_TOOL } from '../../tools/workflow/sfmobile-native-failure/metadata.js';

export class FailureNode extends AbstractToolNode<State> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('workflowFailure', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof FAILURE_TOOL.inputSchema> = {
      llmMetadata: {
        name: FAILURE_TOOL.toolId,
        description: FAILURE_TOOL.description,
        inputSchema: FAILURE_TOOL.inputSchema,
      },
      input: {
        messages: state.workflowFatalErrorMessages,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FAILURE_TOOL.resultSchema
    );
    return validatedResult;
  };
}
