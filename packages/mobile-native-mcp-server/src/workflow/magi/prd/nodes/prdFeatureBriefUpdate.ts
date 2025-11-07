/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { FEATURE_BRIEF_UPDATE_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief-update/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';

import {
  getMagiPath,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/magiDirectory.js';
import { FEATURE_BRIEF_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief-review/metadata.js';
import z from 'zod';

export class PRDFeatureBriefUpdateNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefUpdate', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // This node should only be called when modifications are requested (not approved)
    // The workflow routes approved reviews to the finalization node instead
    if (state.isFeatureBriefApproved) {
      throw new Error(
        'Feature brief update node should not be called for approved reviews. Route to finalization node instead.'
      );
    }

    // Get the path to the feature brief file
    const featureBriefPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    // Construct review result from state
    const reviewResult: z.infer<typeof FEATURE_BRIEF_REVIEW_TOOL.resultSchema> = {
      approved: false, // Always false for update node
      modifications: state.featureBriefModifications,
    };

    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_UPDATE_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: FEATURE_BRIEF_UPDATE_TOOL.toolId,
          description: FEATURE_BRIEF_UPDATE_TOOL.description,
          inputSchema: FEATURE_BRIEF_UPDATE_TOOL.inputSchema,
        },
        input: {
          featureBriefPath: featureBriefPath,
          reviewResult: reviewResult,
        },
      };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_UPDATE_TOOL.resultSchema
    );

    // Write the updated feature brief file with draft status
    // The tool should have already included the status section with "draft" status
    const updatedFeatureBriefPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.featureBriefMarkdown
    );
    this.logger?.info(
      `Updated feature brief written to file: ${updatedFeatureBriefPath} (status: draft)`
    );

    // Clear review state since we've processed the update
    // Content is now always read from file, so don't store in state
    return {
      // Keep the same featureId
      featureId: state.featureId,
      // Clear review state when generating new version
      isFeatureBriefApproved: undefined,
      featureBriefModifications: undefined,
    };
  };
}
