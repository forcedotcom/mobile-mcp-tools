/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { FEATURE_BRIEF_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief-review/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import {
  MAGI_ARTIFACTS,
  readMagiArtifact,
  writeMagiArtifact,
} from '../../../../utils/wellKnownDirectory.js';
import z from 'zod';

export class PRDFeatureBriefReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefReview', toolExecutor, logger);
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
        `Feature brief file not found for featureId: ${state.featureId}. File should exist before review.`
      );
    }

    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_REVIEW_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: FEATURE_BRIEF_REVIEW_TOOL.toolId,
          description: FEATURE_BRIEF_REVIEW_TOOL.description,
          inputSchema: FEATURE_BRIEF_REVIEW_TOOL.inputSchema,
        },
        input: {
          featureBrief: featureBriefContent,
        },
      };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_REVIEW_TOOL.resultSchema
    );

    return this.processReviewResult(validatedResult, state);
  };

  private processReviewResult(
    validatedResult: z.infer<typeof FEATURE_BRIEF_REVIEW_TOOL.resultSchema>,
    state: PRDState
  ): Partial<PRDState> {
    // Validate: If modifications are requested, approved must be false
    const hasModifications =
      validatedResult.modifications && validatedResult.modifications.length > 0;
    if (hasModifications && validatedResult.approved) {
      this.logger?.warn(
        'Invalid state: modifications requested but approved is true. Forcing approved to false.'
      );
      validatedResult.approved = false;
    }

    // If approved, write the updated feature brief content back to file
    // The tool should have updated the status section to "approved"
    if (validatedResult.approved && validatedResult.updatedFeatureBrief) {
      const featureBriefPath = writeMagiArtifact(
        state.projectPath,
        state.featureId,
        MAGI_ARTIFACTS.FEATURE_BRIEF,
        validatedResult.updatedFeatureBrief
      );
      this.logger?.info(
        `Feature brief approved and updated in file: ${featureBriefPath} (status: approved)`
      );
    } else if (validatedResult.approved && !validatedResult.updatedFeatureBrief) {
      this.logger?.warn(
        'Feature brief approved but updatedFeatureBrief not provided. Status may not be updated correctly.'
      );
    }

    return {
      isFeatureBriefApproved: validatedResult.approved,
      featureBriefUserFeedback: validatedResult.userFeedback,
      featureBriefModifications: validatedResult.modifications,
    };
  }
}
