/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { GAP_ANALYSIS_TOOL } from '../../../../tools/magi/prd/magi-prd-gap-analysis/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import { readMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

export class PRDGapAnalysisNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('gapAnalysis', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Check if tool result is already provided in userInput (resume scenario)
    const userInput = state.userInput || {};
    if (typeof userInput.gapAnalysisScore === 'number' && typeof userInput.summary === 'string') {
      // Tool result already provided - use it directly (resume scenario)
      const validatedResult = GAP_ANALYSIS_TOOL.resultSchema.parse({
        gapAnalysisScore: userInput.gapAnalysisScore,
        identifiedGaps: userInput.identifiedGaps || [],
        requirementStrengths: userInput.requirementStrengths || [],
        recommendations: userInput.recommendations || [],
        summary: userInput.summary,
        userWantsToContinueDespiteGaps: userInput.userWantsToContinueDespiteGaps,
      });

      return {
        gapAnalysisScore: validatedResult.gapAnalysisScore,
        identifiedGaps: validatedResult.identifiedGaps,
        userIterationOverride: validatedResult.userWantsToContinueDespiteGaps,
      };
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
    const toolInvocationData: MCPToolInvocationData<typeof GAP_ANALYSIS_TOOL.inputSchema> = {
      llmMetadata: {
        name: GAP_ANALYSIS_TOOL.toolId,
        description: GAP_ANALYSIS_TOOL.description,
        inputSchema: GAP_ANALYSIS_TOOL.inputSchema,
      },
      input: {
        featureBrief: featureBriefContent,
        requirementsContent,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GAP_ANALYSIS_TOOL.resultSchema
    );
    return {
      gapAnalysisScore: validatedResult.gapAnalysisScore,
      identifiedGaps: validatedResult.identifiedGaps,
      userIterationOverride: validatedResult.userWantsToContinueDespiteGaps,
    };
  };
}
