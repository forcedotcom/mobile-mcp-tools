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
import { PRDState } from '../metadata.js';
import { PRD_UPDATE_TOOL } from '../../../../tools/magi/prd/magi-prd-update/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/magiDirectory.js';
import { PRD_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-review/metadata.js';
import z from 'zod';

export class PRDUpdateNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdUpdate', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the PRD file
    const prdFilePath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD);

    // Construct review result from state
    const reviewResult: z.infer<typeof PRD_REVIEW_TOOL.resultSchema> = {
      approved: false, // Always false for update node
      modifications: state.prdModifications,
    };

    const toolInvocationData: MCPToolInvocationData<typeof PRD_UPDATE_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_UPDATE_TOOL.toolId,
        description: PRD_UPDATE_TOOL.description,
        inputSchema: PRD_UPDATE_TOOL.inputSchema,
      },
      input: {
        prdFilePath: prdFilePath,
        reviewResult: reviewResult,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_UPDATE_TOOL.resultSchema
    );

    // Write the updated PRD file
    const updatedPrdPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.PRD,
      validatedResult.updatedPrdContent
    );
    this.logger?.info(`Updated PRD written to file: ${updatedPrdPath}`);

    // Clear review state since we've processed the update
    return {
      // Clear review state when updating
      prdModifications: undefined,
      isPrdApproved: undefined,
    };
  };
}
