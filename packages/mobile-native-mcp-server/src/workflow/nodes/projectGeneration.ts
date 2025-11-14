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
import { PROJECT_GENERATION_TOOL } from '../../tools/plan/sfmobile-native-project-generation/metadata.js';

export class ProjectGenerationNode extends AbstractToolNode<State> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('generateProject', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof PROJECT_GENERATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: PROJECT_GENERATION_TOOL.toolId,
        description: PROJECT_GENERATION_TOOL.description,
        inputSchema: PROJECT_GENERATION_TOOL.inputSchema,
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
      PROJECT_GENERATION_TOOL.resultSchema
    );
    return validatedResult;
  };
}
