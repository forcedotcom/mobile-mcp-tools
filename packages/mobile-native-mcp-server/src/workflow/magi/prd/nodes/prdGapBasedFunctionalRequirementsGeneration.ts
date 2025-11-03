/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL } from '../../../../tools/magi/prd/magi-prd-gap-based-functional-requirements/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import { readMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

/**
 * Workflow node for generating functional requirements based on identified gaps.
 *
 * NOTE: This node is currently not used in the PRD workflow graph.
 * The workflow uses PRDInitialRequirementsGenerationNode and PRDGapRequirementsGenerationNode instead.
 *
 * If this node is to be used, it requires identifiedGaps from state (typically from gap analysis).
 */
export class PRDGapBasedFunctionalRequirementsGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('gapBasedFunctionalRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const featureBriefContent = readMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    // Read requirements content from file
    const requirementsContent = readMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    const toolInvocationData: MCPToolInvocationData<
      typeof GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL.toolId,
        description: GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL.description,
        inputSchema: GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL.inputSchema,
      },
      input: {
        featureBrief: featureBriefContent,
        requirementsContent,
        identifiedGaps: state.identifiedGaps || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL.resultSchema
    );
    return validatedResult;
  };
}
