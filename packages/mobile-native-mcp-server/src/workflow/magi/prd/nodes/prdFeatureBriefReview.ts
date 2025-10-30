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
import fs from 'fs';
import path from 'path';
import { getMagiPath, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';
import z from 'zod';

export class PRDFeatureBriefReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Check if tool result is already provided in userInput (resume scenario)
    const userInput = state.userInput || {};
    if (typeof userInput.approved === 'boolean' && typeof userInput.reviewSummary === 'string') {
      // Tool result already provided - use it directly (resume scenario)
      const validatedResult = FEATURE_BRIEF_REVIEW_TOOL.resultSchema.parse({
        approved: userInput.approved,
        userFeedback: userInput.userFeedback,
        reviewSummary: userInput.reviewSummary,
        modifications: userInput.modifications || [],
      });

      return this.processReviewResult(validatedResult, state);
    }

    // Tool result not provided - need to call the tool
    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_REVIEW_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: FEATURE_BRIEF_REVIEW_TOOL.toolId,
          description: FEATURE_BRIEF_REVIEW_TOOL.description,
          inputSchema: FEATURE_BRIEF_REVIEW_TOOL.inputSchema,
        },
        input: {
          featureBrief: state.featureBriefContent || this.getFeatureBriefContent(state),
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
      // Calculate the feature brief path
      const featureBriefPath = getMagiPath(
        state.projectPath,
        state.featureId,
        MAGI_ARTIFACTS.FEATURE_BRIEF
      );

      // Ensure directory exists
      const featureDirectory = path.dirname(featureBriefPath);
      if (!fs.existsSync(featureDirectory)) {
        throw new Error(
          `Cannot write feature brief: directory does not exist at ${featureDirectory}`
        );
      }

      // Write the approved feature brief to disk
      fs.writeFileSync(featureBriefPath, state.featureBriefContent);
      this.logger?.info(`Feature brief approved and written to file: ${featureBriefPath}`);
    }

    return {
      isFeatureBriefApproved: validatedResult.approved,
      featureBriefUserFeedback: validatedResult.userFeedback,
      featureBriefModifications: validatedResult.modifications,
    };
  }

  private getFeatureBriefContent(state: PRDState): string {
    if (state.featureBriefContent) {
      return state.featureBriefContent;
    }

    if (state.projectPath && state.featureId) {
      try {
        const featureBriefPath = getMagiPath(
          state.projectPath,
          state.featureId,
          MAGI_ARTIFACTS.FEATURE_BRIEF
        );
        if (fs.existsSync(featureBriefPath)) {
          return fs.readFileSync(featureBriefPath, 'utf8');
        }
      } catch (error) {
        this.logger?.warn(
          `Could not read feature brief: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return '';
  }
}
