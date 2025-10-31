/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { INITIAL_REQUIREMENTS_TOOL } from '../../../../tools/magi/prd/magi-prd-initial-requirements/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import { readMagiArtifact, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

/**
 * Workflow node for generating initial functional requirements from a feature brief.
 */
export class PRDInitialRequirementsGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('initialRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get feature brief content from state or file
    const featureBriefContent = state.featureBriefContent
      ? state.featureBriefContent
      : state.projectPath && state.featureId
        ? readMagiArtifact(state.projectPath, state.featureId, MAGI_ARTIFACTS.FEATURE_BRIEF)
        : '';

    const toolInvocationData: MCPToolInvocationData<typeof INITIAL_REQUIREMENTS_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: INITIAL_REQUIREMENTS_TOOL.toolId,
          description: INITIAL_REQUIREMENTS_TOOL.description,
          inputSchema: INITIAL_REQUIREMENTS_TOOL.inputSchema,
        },
        input: {
          featureBrief: featureBriefContent,
        },
      };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      INITIAL_REQUIREMENTS_TOOL.resultSchema
    );
    return validatedResult;
  };
}
