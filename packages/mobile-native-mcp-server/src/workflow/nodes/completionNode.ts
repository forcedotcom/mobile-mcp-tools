/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractSchemaNode } from './abstractSchemaNode.js';
import { FINISH_TOOL } from '../../tools/workflow/sfmobile-native-completion/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class CompletionNode extends AbstractSchemaNode {
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
