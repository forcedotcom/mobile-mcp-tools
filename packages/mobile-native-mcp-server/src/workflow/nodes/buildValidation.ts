/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from './abstractToolNode.js';
import { BUILD_EXECUTOR_TOOL } from '../../tools/run/sfmobile-native-build-executor/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class BuildValidationNode extends AbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('validateBuild', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Call the build executor tool which will handle progress reporting
    const toolInvocationData: MCPToolInvocationData<typeof BUILD_EXECUTOR_TOOL.inputSchema> = {
      llmMetadata: {
        name: BUILD_EXECUTOR_TOOL.toolId,
        description: BUILD_EXECUTOR_TOOL.description,
        inputSchema: BUILD_EXECUTOR_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        projectPath: state.projectPath,
        projectName: state.projectName,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      BUILD_EXECUTOR_TOOL.resultSchema
    );

    return { buildSuccessful: validatedResult.success };
  };
}
