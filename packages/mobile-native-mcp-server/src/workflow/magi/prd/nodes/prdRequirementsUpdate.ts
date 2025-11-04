/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { REQUIREMENTS_UPDATE_TOOL } from '../../../../tools/magi/prd/magi-prd-requirements-update/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import {
  getMagiPath,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';
import { REQUIREMENTS_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-requirements-review/metadata.js';
import z from 'zod';

export class PRDRequirementsUpdateNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsUpdate', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get the path to the requirements file
    const requirementsPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    // Construct review result from state
    const reviewResult: z.infer<typeof REQUIREMENTS_REVIEW_TOOL.resultSchema> = {
      approvedRequirementIds: state.approvedRequirementIds || [],
      rejectedRequirementIds: state.rejectedRequirementIds || [],
      modifications: state.requirementModifications,
      userFeedback: state.requirementsUserFeedback,
      reviewSummary: state.requirementsReviewSummary || 'Requirements review feedback applied',
    };

    const toolInvocationData: MCPToolInvocationData<typeof REQUIREMENTS_UPDATE_TOOL.inputSchema> = {
      llmMetadata: {
        name: REQUIREMENTS_UPDATE_TOOL.toolId,
        description: REQUIREMENTS_UPDATE_TOOL.description,
        inputSchema: REQUIREMENTS_UPDATE_TOOL.inputSchema,
      },
      input: {
        requirementsPath: requirementsPath,
        reviewResult: reviewResult,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      REQUIREMENTS_UPDATE_TOOL.resultSchema
    );

    // Write the updated requirements file with draft status
    // The tool should have already included the status section with "draft" status
    const updatedRequirementsPath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS,
      validatedResult.updatedRequirementsContent
    );
    this.logger?.info(
      `Updated requirements written to file: ${updatedRequirementsPath} (status: draft)`
    );

    // Clear review state since we've processed the update
    // Content is now always read from file, so don't store in state
    return {
      // Clear review state when updating
      approvedRequirementIds: undefined,
      rejectedRequirementIds: undefined,
      requirementModifications: undefined,
      requirementsUserFeedback: undefined,
      requirementsReviewSummary: undefined,
    };
  };
}

