/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '@salesforce/magen-mcp-workflow';
import { TEMPLATE_DISCOVERY_TOOL } from '../../tools/plan/sfmobile-native-template-discovery/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from '@salesforce/magen-mcp-workflow';
import { ToolExecutor } from '@salesforce/magen-mcp-workflow';
import { Logger } from '@salesforce/magen-mcp-workflow';

export class TemplateDiscoveryNode extends AbstractToolNode<State> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('discoverTemplates', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof TEMPLATE_DISCOVERY_TOOL.inputSchema> = {
      llmMetadata: {
        name: TEMPLATE_DISCOVERY_TOOL.toolId,
        description: TEMPLATE_DISCOVERY_TOOL.description,
        inputSchema: TEMPLATE_DISCOVERY_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      TEMPLATE_DISCOVERY_TOOL.resultSchema
    );
    return validatedResult;
  };
}
