/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from './abstractToolNode.js';
import { PRD_REVIEW_TOOL } from '../../tools/workflow/sfmobile-native-prd-review/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class PRDReviewNode extends AbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdReview', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof PRD_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_REVIEW_TOOL.toolId,
        description: PRD_REVIEW_TOOL.description,
        inputSchema: PRD_REVIEW_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
        prdContent: state.prdContent || '',
        prdFilePath: state.prdFilePath || '',
        documentStatus: state.prdDocumentStatus || {
          author: 'AI Assistant (Mobile MCP Tools)',
          lastModified: new Date().toISOString().split('T')[0],
          status: 'draft',
        },
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_REVIEW_TOOL.resultSchema
    );
    return validatedResult;
  };
}
