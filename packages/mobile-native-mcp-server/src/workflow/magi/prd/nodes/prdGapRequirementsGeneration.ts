/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { GAP_REQUIREMENTS_TOOL } from '../../../../tools/magi/prd/magi-prd-gap-requirements/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import { readMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

/**
 * Workflow node for generating functional requirements based on identified gaps.
 */
export class PRDGapRequirementsGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('gapRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
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

    const toolInvocationData: MCPToolInvocationData<typeof GAP_REQUIREMENTS_TOOL.inputSchema> = {
      llmMetadata: {
        name: GAP_REQUIREMENTS_TOOL.toolId,
        description: GAP_REQUIREMENTS_TOOL.description,
        inputSchema: GAP_REQUIREMENTS_TOOL.inputSchema,
      },
      input: {
        featureBrief: featureBriefContent,
        requirementsContent,
        identifiedGaps: state.identifiedGaps || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GAP_REQUIREMENTS_TOOL.resultSchema
    );
    return validatedResult;
  };
}
