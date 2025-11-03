/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { REQUIREMENTS_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-requirements-review/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import {
  readMagiArtifact,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';
import z from 'zod';

export class PRDRequirementsReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Read requirements content from file
    const requirementsContent = readMagiArtifact(
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
        requirementsContent: requirementsContent || '',
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      REQUIREMENTS_REVIEW_TOOL.resultSchema
    );

    return this.processReviewResult(validatedResult, state);
  };

  private processReviewResult(
    validatedResult: z.infer<typeof REQUIREMENTS_REVIEW_TOOL.resultSchema>,
    state: PRDState
  ): Partial<PRDState> {
    // Write the updated requirements markdown content to disk
    const requirementsFilePath = writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS,
      validatedResult.updatedRequirementsContent
    );
    this.logger?.info(`Requirements updated and written to file: ${requirementsFilePath}`);

    // Return empty state update (paths are calculated when needed)
    return {};
  }
}
