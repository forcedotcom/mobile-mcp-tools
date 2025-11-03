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
  readMagiArtifact,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';

export class PRDFeatureBriefUpdateNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefUpdate', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Always read feature brief content from file
    const featureBriefContent = readMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF
    );

    if (!featureBriefContent) {
      throw new Error(
        `Feature brief file not found for featureId: ${state.featureId}. File should exist before update.`
      );
    }

    // Build tool input with update context
    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_UPDATE_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: FEATURE_BRIEF_UPDATE_TOOL.toolId,
          description: FEATURE_BRIEF_UPDATE_TOOL.description,
          inputSchema: FEATURE_BRIEF_UPDATE_TOOL.inputSchema,
        },
        input: {
          existingFeatureId: state.featureId,
          featureBrief: featureBriefContent,
          userUtterance: state.userUtterance || '',
          userFeedback: state.featureBriefUserFeedback,
          modifications: state.featureBriefModifications,
        },
      };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_UPDATE_TOOL.resultSchema
    );

    // Write the updated feature brief file immediately with draft status
    // The tool should have already included the status section with "draft" status
    const featureBriefPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.featureBriefMarkdown
    );
    this.logger?.info(`Updated feature brief written to file: ${featureBriefPath} (status: draft)`);

    // Clear review state since we've processed the update
    // Content is now always read from file, so don't store in state
    return {
      // Keep the same featureId
      featureId: state.featureId,
      // Clear review state when generating new version
      isFeatureBriefApproved: undefined,
      featureBriefUserFeedback: undefined,
      featureBriefModifications: undefined,
    };
  };
}
