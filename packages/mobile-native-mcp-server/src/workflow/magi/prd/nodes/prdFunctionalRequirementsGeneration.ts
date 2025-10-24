/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { FUNCTIONAL_REQUIREMENTS_TOOL } from '../../../../tools/magi/magi-functional-requirements/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';

export class PRDFunctionalRequirementsGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('functionalRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const toolInvocationData: MCPToolInvocationData<
      typeof FUNCTIONAL_REQUIREMENTS_TOOL.inputSchema
    > = {
      llmMetadata: {
        name: FUNCTIONAL_REQUIREMENTS_TOOL.toolId,
        description: FUNCTIONAL_REQUIREMENTS_TOOL.description,
        inputSchema: FUNCTIONAL_REQUIREMENTS_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
        featureBrief: state.featureBrief || '',
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FUNCTIONAL_REQUIREMENTS_TOOL.resultSchema
    );
    return validatedResult;
  };
}
