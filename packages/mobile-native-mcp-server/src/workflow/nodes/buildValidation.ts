/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractSchemaNode } from './abstractSchemaNode.js';
import { BUILD_TOOL } from '../../tools/plan/sfmobile-native-build/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class BuildValidationNode extends AbstractSchemaNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('validateBuild', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof BUILD_TOOL.inputSchema> = {
      llmMetadata: {
        name: BUILD_TOOL.toolId,
        description: BUILD_TOOL.description,
        inputSchema: BUILD_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        projectPath: state.projectPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      BUILD_TOOL.resultSchema
    );
    return validatedResult;
  };
}
