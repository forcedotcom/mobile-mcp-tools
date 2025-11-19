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
import { PRD_FINALIZATION_TOOL } from '../../../tools/prd/magi-prd-finalization/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

export class PRDFinalizationNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdFinalization', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the PRD file
    const prdFilePath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.PRD);

    const toolInvocationData: MCPToolInvocationData<typeof PRD_FINALIZATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_FINALIZATION_TOOL.toolId,
        description: PRD_FINALIZATION_TOOL.description,
        inputSchema: PRD_FINALIZATION_TOOL.inputSchema,
      },
      input: {
        prdFilePath: prdFilePath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_FINALIZATION_TOOL.resultSchema
    );

    // Write the finalized PRD file back to disk with finalized status
    const finalizedPrdPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.PRD,
      validatedResult.finalizedPrdContent
    );
    this.logger?.info(`PRD finalized and written to file: ${finalizedPrdPath} (status: finalized)`);

    this.logger?.info('PRD workflow completed');
    // Clear transient review state since PRD is finalized
    return {
      isPrdApproved: undefined,
      prdModifications: undefined,
    };
  };
}
