/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { FEATURE_BRIEF_TOOL } from '../../../tools/magi/magi-feature-brief/metadata.js';
import { ToolExecutor } from '../../nodes/toolExecutor.js';
import { Logger } from '../../../logging/logger.js';

export class PRDFeatureBriefGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_TOOL.inputSchema> = {
      llmMetadata: {
        name: FEATURE_BRIEF_TOOL.toolId,
        description: FEATURE_BRIEF_TOOL.description,
        inputSchema: FEATURE_BRIEF_TOOL.inputSchema,
      },
      input: {
        userUtterance: state.originalUserUtterance || '',
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_TOOL.resultSchema
    );

    return {
      featureBrief: validatedResult.featureBriefMarkdown,
    };
  };
}
