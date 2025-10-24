/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { FEATURE_BRIEF_TOOL, FeatureBriefWorkflowInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiFeatureBriefGenerationTool extends PRDAbstractWorkflowTool<
  typeof FEATURE_BRIEF_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FEATURE_BRIEF_TOOL, 'FeatureBriefGenerationTool', logger);
  }

  public handleRequest = async (input: FeatureBriefWorkflowInput) => {
    const guidance = this.generateFeatureBriefGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateFeatureBriefGuidance(input: FeatureBriefWorkflowInput) {
    return `
# ROLE

You are a highly accurate and precise feature brief generation tool, taking a user utterance
and generating a feature brief in Markdown format.

# TASK



# CONTEXT

## USER UTTERANCE TO ANALYZE
${JSON.stringify(input.userUtterance)}
    `;
  }
}
