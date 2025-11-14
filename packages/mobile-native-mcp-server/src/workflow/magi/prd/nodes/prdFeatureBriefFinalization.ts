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
import { FEATURE_BRIEF_FINALIZATION_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief-finalization/metadata.js';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/magiDirectory.js';

/**
 * Workflow node for finalizing feature brief after user approval.
 * This node updates the status to "approved" without modifying content.
 */
export class PRDFeatureBriefFinalizationNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefFinalization', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the feature brief file
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    const toolInvocationData: MCPToolInvocationData<
      typeof FEATURE_BRIEF_FINALIZATION_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: FEATURE_BRIEF_FINALIZATION_TOOL.toolId,
        description: FEATURE_BRIEF_FINALIZATION_TOOL.description,
        inputSchema: FEATURE_BRIEF_FINALIZATION_TOOL.inputSchema,
      },
      input: {
        featureBriefPath: featureBriefPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_FINALIZATION_TOOL.resultSchema
    );

    // Write the finalized feature brief file back to disk with approved status
    const featureBriefFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.finalizedFeatureBriefContent
    );
    this.logger?.info(
      `Feature brief finalized and written to file: ${featureBriefFilePath} (status: approved)`
    );

    // Clear review state since feature brief is finalized
    return {
      isFeatureBriefApproved: undefined,
      featureBriefModifications: undefined,
    };
  };
}
