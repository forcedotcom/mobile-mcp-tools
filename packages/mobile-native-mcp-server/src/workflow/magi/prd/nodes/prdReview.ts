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
import { getMagiPath, MAGI_ARTIFACTS } from '../../../../utils/magiDirectory.js';

export class PRDReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    if (!state.projectPath || !state.featureId) {
      throw new Error(
        'PRD review requires both projectPath and featureId to be set in state. Cannot proceed without valid paths.'
      );
    }

    const prdFilePath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD);

    const toolInvocationData: MCPToolInvocationData<typeof PRD_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_REVIEW_TOOL.toolId,
        description: PRD_REVIEW_TOOL.description,
        inputSchema: PRD_REVIEW_TOOL.inputSchema,
      },
      input: {
        prdFilePath: prdFilePath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_REVIEW_TOOL.resultSchema
    );

    // Store review feedback in state for the update node to process
    return {
      isPrdApproved: validatedResult.approved,
      prdModifications: validatedResult.modifications,
    };
  };
}
