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
import fs from 'fs';
import { getMagiPath, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

/**
 * Workflow node for generating initial functional requirements from a feature brief.
 */
export class PRDInitialRequirementsGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('initialRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get feature brief content from state or file
    let featureBriefContent = '';
    if (state.featureBriefContent) {
      featureBriefContent = state.featureBriefContent;
    } else if (state.projectPath && state.featureId) {
      try {
        const featureBriefPath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.FEATURE_BRIEF);
        if (fs.existsSync(featureBriefPath)) {
          featureBriefContent = fs.readFileSync(featureBriefPath, 'utf8');
        }
      } catch (error) {
        // Feature brief may not exist yet, continue with empty content
      }
    }

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
