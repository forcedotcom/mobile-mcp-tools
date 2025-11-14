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
import { State } from '../metadata.js';
import { FINISH_TOOL } from '../../tools/workflow/sfmobile-native-completion/metadata.js';

export class CompletionNode extends AbstractToolNode<State> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('finish', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof FINISH_TOOL.inputSchema> = {
      llmMetadata: {
        name: FINISH_TOOL.toolId,
        description: FINISH_TOOL.description,
        inputSchema: FINISH_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FINISH_TOOL.resultSchema
    );
    return validatedResult;
  };
}
