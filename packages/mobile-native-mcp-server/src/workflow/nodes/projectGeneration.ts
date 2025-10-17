/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from './abstractToolNode.js';
import { PROJECT_GENERATION_EXECUTOR_TOOL } from '../../tools/run/sfmobile-native-project-generation-executor/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class ProjectGenerationNode extends AbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('generateProject', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Call the project generation executor tool which will handle progress reporting
    const toolInvocationData: MCPToolInvocationData<
      typeof PROJECT_GENERATION_EXECUTOR_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: PROJECT_GENERATION_EXECUTOR_TOOL.toolId,
        description: PROJECT_GENERATION_EXECUTOR_TOOL.description,
        inputSchema: PROJECT_GENERATION_EXECUTOR_TOOL.inputSchema,
      },
      input: {
        selectedTemplate: state.selectedTemplate,
        projectName: state.projectName,
        platform: state.platform,
        packageName: state.packageName,
        organization: state.organization,
        connectedAppClientId: state.connectedAppClientId,
        connectedAppCallbackUri: state.connectedAppCallbackUri,
        loginHost: state.loginHost,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PROJECT_GENERATION_EXECUTOR_TOOL.resultSchema
    );

    return {
      projectPath: validatedResult.projectPath ?? '',
    };
  };
}
