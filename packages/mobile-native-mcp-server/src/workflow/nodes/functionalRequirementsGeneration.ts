/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from './abstractToolNode.js';
import { FUNCTIONAL_REQUIREMENTS_TOOL } from '../../tools/workflow/sfmobile-native-functional-requirements/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class FunctionalRequirementsGenerationNode extends AbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('functionalRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
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
        // For initial generation, these will be undefined/empty
        existingRequirements: state.functionalRequirements || [],
        identifiedGaps: state.identifiedGaps || [],
        isGapBasedGeneration: false, // This is initial generation
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FUNCTIONAL_REQUIREMENTS_TOOL.resultSchema
    );
    return validatedResult;
  };
}
