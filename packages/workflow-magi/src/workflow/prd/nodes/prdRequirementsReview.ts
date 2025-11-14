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
import { REQUIREMENTS_REVIEW_TOOL } from '../../../tools/prd/magi-prd-requirements-review/metadata.js';
import { getMagiPath, MAGI_ARTIFACTS } from '../../../utils/magiDirectory.js';

export class PRDRequirementsReviewNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const requirementsPath = getMagiPath(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    const toolInvocationData: MCPToolInvocationData<typeof REQUIREMENTS_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: REQUIREMENTS_REVIEW_TOOL.toolId,
        description: REQUIREMENTS_REVIEW_TOOL.description,
        inputSchema: REQUIREMENTS_REVIEW_TOOL.inputSchema,
      },
      input: {
        requirementsPath: requirementsPath,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      REQUIREMENTS_REVIEW_TOOL.resultSchema
    );

    // Store review feedback in state for the update node to process
    return {
      approvedRequirementIds: validatedResult.approvedRequirementIds,
      rejectedRequirementIds: validatedResult.rejectedRequirementIds,
      requirementModifications: validatedResult.modifications,
      userIterationPreference: validatedResult.userIterationPreference,
    };
  };
}
