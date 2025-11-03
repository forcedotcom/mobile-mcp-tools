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
    // Tool result not provided - need to call the tool
    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_REVIEW_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: FEATURE_BRIEF_REVIEW_TOOL.toolId,
          description: FEATURE_BRIEF_REVIEW_TOOL.description,
          inputSchema: FEATURE_BRIEF_REVIEW_TOOL.inputSchema,
        },
        input: {
          featureBrief:
            state.featureBriefContent ||
            (state.projectPath && state.featureId
              ? readMagiArtifact(state.projectPath, state.featureId, MAGI_ARTIFACTS.FEATURE_BRIEF)
              : ''),
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

    // If approved and file doesn't exist yet, write the file now
    if (
      validatedResult.approved &&
      state.featureBriefContent &&
      state.projectPath &&
      state.featureId
    ) {
      // Write the approved feature brief to disk
      const featureBriefPath = writeMagiArtifact(
        state.projectPath,
        state.featureId,
        MAGI_ARTIFACTS.FEATURE_BRIEF,
        state.featureBriefContent
      );
      this.logger?.info(`Feature brief approved and written to file: ${featureBriefPath}`);
    }

    return {
      isFeatureBriefApproved: validatedResult.approved,
      featureBriefUserFeedback: validatedResult.userFeedback,
      featureBriefModifications: validatedResult.modifications,
    };
  }
}
