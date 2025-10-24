/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { GAP_ANALYSIS_TOOL } from '../../../../tools/magi/prd/magi-prd-gap-analysis/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';

export class PRDGapAnalysisNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('gapAnalysis', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<typeof GAP_ANALYSIS_TOOL.inputSchema> = {
      llmMetadata: {
        name: GAP_ANALYSIS_TOOL.toolId,
        description: GAP_ANALYSIS_TOOL.description,
        inputSchema: GAP_ANALYSIS_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
        featureBrief: state.featureBrief || '',
        functionalRequirements: state.functionalRequirements || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GAP_ANALYSIS_TOOL.resultSchema
    );
    return validatedResult;
  };
}
