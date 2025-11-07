/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { PRD_GENERATION_TOOL } from '../../../../tools/magi/prd/magi-prd-generation/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import {
  MAGI_ARTIFACTS,
  getMagiPath,
  writeMagiArtifact,
} from '../../../../utils/magiDirectory.js';
import z from 'zod';

export class PRDGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    const requirementsPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    const toolInvocationData: MCPToolInvocationData<typeof PRD_GENERATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_GENERATION_TOOL.toolId,
        description: PRD_GENERATION_TOOL.description,
        inputSchema: PRD_GENERATION_TOOL.inputSchema,
      },
      input: {
        featureBriefPath: featureBriefPath,
        requirementsPath: requirementsPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_GENERATION_TOOL.resultSchema
    );

    return this.processPrdResult(validatedResult, state);
  };

  private processPrdResult(
    validatedResult: z.infer<typeof PRD_GENERATION_TOOL.resultSchema>,
    state: PRDState
  ): Partial<PRDState> {
    // Write the PRD content to disk
    const prdFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.PRD,
      validatedResult.prdContent
    );
    this.logger?.info(`PRD written to file: ${prdFilePath}`);

    return {};
  }
}
