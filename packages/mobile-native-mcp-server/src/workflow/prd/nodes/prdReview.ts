/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { PRD_REVIEW_TOOL } from '../../../tools/magi/magi-prd-review/metadata.js';
import { ToolExecutor } from '../../nodes/toolExecutor.js';
import { Logger } from '../../../logging/logger.js';

export class PRDReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<typeof PRD_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_REVIEW_TOOL.toolId,
        description: PRD_REVIEW_TOOL.description,
        inputSchema: PRD_REVIEW_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
        prdContent: state.prdContent || '',
        prdFilePath: state.prdFilePath || `${state.projectPath}/PRD.md`,
        documentStatus: state.prdDocumentStatus || {
          author: 'PRD Generator',
          lastModified: new Date().toISOString(),
          status: 'draft' as const,
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
