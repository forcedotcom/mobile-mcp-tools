/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '@salesforce/magen-mcp-workflow';
import { PRDState } from '../metadata.js';
import { AbstractToolNode } from '@salesforce/magen-mcp-workflow';
import { REQUIREMENTS_UPDATE_TOOL } from '../../../../tools/magi/prd/magi-prd-requirements-update/metadata.js';
import { ToolExecutor } from '@salesforce/magen-mcp-workflow';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { getMagiPath, writeMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/magiDirectory.js';
import { RequirementsReviewResult } from '../../../../tools/magi/prd/magi-prd-requirements-review/metadata.js';

export class PRDRequirementsUpdateNode extends AbstractToolNode<PRDState> {
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
    const reviewResult: RequirementsReviewResult = {
      approvedRequirementIds: state.approvedRequirementIds || [],
      rejectedRequirementIds: state.rejectedRequirementIds || [],
      modifications: state.requirementModifications,
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
    };
  };
}
