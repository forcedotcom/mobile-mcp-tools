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
import { DEPLOYMENT_TOOL } from '../../tools/run/sfmobile-native-deployment/metadata.js';

export class DeploymentNode extends AbstractToolNode<State> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('deployApp', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof DEPLOYMENT_TOOL.inputSchema> = {
      llmMetadata: {
        name: DEPLOYMENT_TOOL.toolId,
        description: DEPLOYMENT_TOOL.description,
        inputSchema: DEPLOYMENT_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        projectPath: state.projectPath,
        buildType: state.buildType,
        targetDevice: state.targetDevice,
        packageName: state.packageName,
        projectName: state.projectName,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      DEPLOYMENT_TOOL.resultSchema
    );
    return validatedResult;
  };
}
