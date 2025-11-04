/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { REQUIREMENTS_FINALIZATION_TOOL } from '../../../../tools/magi/prd/magi-prd-requirements-finalization/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import {
  readMagiArtifact,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';

/**
 * Workflow node for finalizing requirements before proceeding to PRD generation.
 * This node ensures all requirements are reviewed and updates status to "approved".
 */
export class PRDRequirementsFinalizationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsFinalization', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Always read requirements content from file
    const requirementsContent = readMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    if (!requirementsContent) {
      throw new Error(
        `Requirements file not found for featureId: ${state.featureId}. Requirements file should exist before finalization.`
      );
    }

    const toolInvocationData: MCPToolInvocationData<
      typeof REQUIREMENTS_FINALIZATION_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: REQUIREMENTS_FINALIZATION_TOOL.toolId,
        description: REQUIREMENTS_FINALIZATION_TOOL.description,
        inputSchema: REQUIREMENTS_FINALIZATION_TOOL.inputSchema,
      },
      input: {
        requirementsContent: requirementsContent,
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

    return {};
  };
}
