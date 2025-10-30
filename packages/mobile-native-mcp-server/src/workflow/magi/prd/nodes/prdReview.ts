/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { PRD_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-review/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import { getMagiPath, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

export class PRDReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Check if tool result is already provided in userInput (resume scenario)
    const userInput = state.userInput || {};
    if (typeof userInput.prdApproved === 'boolean' && typeof userInput.reviewSummary === 'string') {
      // Tool result already provided - use it directly (resume scenario)
      const validatedResult = PRD_REVIEW_TOOL.resultSchema.parse({
        prdApproved: userInput.prdApproved,
        prdModifications: userInput.prdModifications || [],
        userFeedback: userInput.userFeedback,
        reviewSummary: userInput.reviewSummary,
      });

      return {
        isPrdApproved: validatedResult.prdApproved,
      };
    }

    // Tool result not provided - need to call the tool
    const prdFilePath =
      state.projectPath && state.featureId
        ? getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD)
        : '';

    const toolInvocationData: MCPToolInvocationData<typeof PRD_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_REVIEW_TOOL.toolId,
        description: PRD_REVIEW_TOOL.description,
        inputSchema: PRD_REVIEW_TOOL.inputSchema,
      },
      input: {
        prdContent: state.prdContent || '',
        prdFilePath: prdFilePath,
        documentStatus: state.prdStatus || {
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
    return {
      isPrdApproved: validatedResult.prdApproved,
    };
  };
}
