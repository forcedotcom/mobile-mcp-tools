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
import { REQUIREMENTS_FINALIZATION_TOOL } from '../../../tools/prd/magi-prd-requirements-finalization/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

/**
 * Workflow node for finalizing requirements before proceeding to PRD generation.
 * This node ensures all requirements are reviewed and updates status to "approved".
 */
export class PRDRequirementsFinalizationNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsFinalization', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the requirements file
    const requirementsPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    const toolInvocationData: MCPToolInvocationData<
      typeof REQUIREMENTS_FINALIZATION_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: REQUIREMENTS_FINALIZATION_TOOL.toolId,
        description: REQUIREMENTS_FINALIZATION_TOOL.description,
        inputSchema: REQUIREMENTS_FINALIZATION_TOOL.inputSchema,
      },
      input: {
        requirementsPath: requirementsPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      REQUIREMENTS_FINALIZATION_TOOL.resultSchema
    );

    // Write the finalized requirements file back to disk with approved status
    const requirementsFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS,
      validatedResult.finalizedRequirementsContent
    );
    this.logger?.info(
      `Requirements finalized and written to file: ${requirementsFilePath} (status: approved)`
    );

    // Clear transient review and gap analysis state since requirements are finalized
    return {
      approvedRequirementIds: undefined,
      rejectedRequirementIds: undefined,
      requirementModifications: undefined,
      userIterationPreference: undefined,
      gapAnalysisScore: undefined,
      identifiedGaps: undefined,
    };
  };
}
