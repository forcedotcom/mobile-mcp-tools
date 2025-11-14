/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractToolNode,
  Logger,
  MCPToolInvocationData,
  ToolExecutor,
} from '@salesforce/magen-mcp-workflow';
import { PRDState } from '../metadata.js';
import { PRD_FAILURE_TOOL } from '../../../tools/prd/magi-prd-failure/metadata.js';

export class PRDFailureNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdFailure', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<typeof PRD_FAILURE_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_FAILURE_TOOL.toolId,
        description: PRD_FAILURE_TOOL.description,
        inputSchema: PRD_FAILURE_TOOL.inputSchema,
      },
      input: {
        messages: state.prdWorkflowFatalErrorMessages || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_FAILURE_TOOL.resultSchema
    );
    return validatedResult;
  };
}
