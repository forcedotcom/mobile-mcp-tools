/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../common/metadata.js';
import { State } from '../metadata.js';
import { AbstractToolNode } from './abstractToolNode.js';
import { REQUIREMENTS_REVIEW_TOOL } from '../../tools/workflow/sfmobile-native-requirements-review/metadata.js';
import { ToolExecutor } from './toolExecutor.js';
import { Logger } from '../../logging/logger.js';

export class RequirementsReviewNode extends AbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsReview', toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    const toolInvocationData: MCPToolInvocationData<typeof REQUIREMENTS_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: REQUIREMENTS_REVIEW_TOOL.toolId,
        description: REQUIREMENTS_REVIEW_TOOL.description,
        inputSchema: REQUIREMENTS_REVIEW_TOOL.inputSchema,
      },
      input: {
        projectPath: state.projectPath,
        functionalRequirements: state.functionalRequirements || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      REQUIREMENTS_REVIEW_TOOL.resultSchema
    );
    return validatedResult;
  };
}
