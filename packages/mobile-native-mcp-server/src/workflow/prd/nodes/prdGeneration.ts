/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { PRD_GENERATION_TOOL } from '../../../tools/magi/magi-prd-generation/metadata.js';
import { ToolExecutor } from '../../nodes/toolExecutor.js';
import { Logger } from '../../../logging/logger.js';

export class PRDGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<typeof PRD_GENERATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_GENERATION_TOOL.toolId,
        description: PRD_GENERATION_TOOL.description,
        inputSchema: PRD_GENERATION_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
        originalUserUtterance: state.originalUserUtterance || '',
        featureBrief: state.featureBrief || '',
        approvedRequirements: state.approvedRequirements || [],
        modifiedRequirements: state.modifiedRequirements || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_GENERATION_TOOL.resultSchema
    );
    return validatedResult;
  };
}
