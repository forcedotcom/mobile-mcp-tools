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
import { GAP_REQUIREMENTS_TOOL } from '../../../tools/prd/magi-prd-gap-requirements/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

/**
 * Workflow node for generating functional requirements based on identified gaps.
 */
export class PRDGapRequirementsGenerationNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('gapRequirementsGeneration', toolExecutor, logger);
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

    const toolInvocationData: MCPToolInvocationData<typeof GAP_REQUIREMENTS_TOOL.inputSchema> = {
      llmMetadata: {
        name: GAP_REQUIREMENTS_TOOL.toolId,
        description: GAP_REQUIREMENTS_TOOL.description,
        inputSchema: GAP_REQUIREMENTS_TOOL.inputSchema,
      },
      input: {
        featureBriefPath: featureBriefPath,
        requirementsPath: requirementsPath,
        identifiedGaps: state.identifiedGaps || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GAP_REQUIREMENTS_TOOL.resultSchema
    );

    // Write the updated requirements file immediately with draft status
    // The tool should have already included the status section and appended new requirements
    const requirementsFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS,
      validatedResult.updatedRequirementsMarkdown
    );
    this.logger?.info(
      `Gap-based requirements written to file: ${requirementsFilePath} (status: draft)`
    );

    // Return empty state - content is now always read from file
    return {};
  };
}
