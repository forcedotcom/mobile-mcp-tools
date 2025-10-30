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
  readMagiArtifact,
  writeMagiArtifact,
} from '../../../../utils/wellKnownDirectory.js';
import z from 'zod';

export class PRDGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Check if tool result is already provided in userInput (resume scenario)
    const userInput = state.userInput || {};
    if (typeof userInput.prdContent === 'string' && typeof userInput.prdFilePath === 'string') {
      // Tool result already provided - use it directly (resume scenario)
      const validatedResult = PRD_GENERATION_TOOL.resultSchema.parse({
        prdContent: userInput.prdContent,
        prdFilePath: userInput.prdFilePath,
        documentStatus: userInput.documentStatus || {
          author: 'PRD Generator',
          lastModified: new Date().toISOString().split('T')[0],
          status: 'draft' as const,
        },
        requirementsCount: userInput.requirementsCount || 0,
        traceabilityTableRows: userInput.traceabilityTableRows || [],
      });

      return this.processPrdResult(validatedResult, state);
    }

    // Get feature brief content from state or file
    const featureBriefContent = state.featureBriefContent
      ? state.featureBriefContent
      : state.projectPath && state.featureId
        ? readMagiArtifact(state.projectPath, state.featureId, MAGI_ARTIFACTS.FEATURE_BRIEF)
        : '';

    // Read requirements content from file
    const requirementsContent =
      state.projectPath && state.featureId
        ? readMagiArtifact(state.projectPath, state.featureId, MAGI_ARTIFACTS.REQUIREMENTS)
        : '';

    // Tool result not provided - need to call the tool
    const toolInvocationData: MCPToolInvocationData<typeof PRD_GENERATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_GENERATION_TOOL.toolId,
        description: PRD_GENERATION_TOOL.description,
        inputSchema: PRD_GENERATION_TOOL.inputSchema,
      },
      input: {
        originalUserUtterance: state.userUtterance || '',
        featureBrief: featureBriefContent,
        requirementsContent,
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
    // Validate required state
    if (!state.projectPath || !state.featureId) {
      throw new Error('Cannot determine feature directory: projectPath and featureId are missing');
    }

    // Write the PRD content to disk
    const prdFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.PRD,
      validatedResult.prdContent
    );
    this.logger?.info(`PRD written to file: ${prdFilePath}`);

    // Return minimal mapped state - paths are now calculated from projectPath and featureId
    return {
      prdContent: validatedResult.prdContent,
      prdStatus: validatedResult.documentStatus,
    };
  }
}
