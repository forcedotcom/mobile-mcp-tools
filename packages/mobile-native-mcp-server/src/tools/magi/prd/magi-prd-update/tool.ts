/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { PRD_UPDATE_TOOL, PRDUpdateInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiPRDUpdateTool extends PRDAbstractWorkflowTool<typeof PRD_UPDATE_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, PRD_UPDATE_TOOL, 'PRDUpdateTool', logger);
  }

  public handleRequest = async (input: PRDUpdateInput) => {
    const guidance = this.generatePRDUpdateGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generatePRDUpdateGuidance(input: PRDUpdateInput) {
    const prdPath = input.prdFilePath;
    const reviewResult = input.reviewResult;
    const hasModifications = reviewResult.modifications && reviewResult.modifications.length > 0;

    return `
# ROLE

You are a PRD update tool. Your task is to update an EXISTING PRD.md file based on review feedback. You must read the current PRD file, apply the requested modifications, and return the updated content.

# CONTEXT

## PRD File to Update

**File Path**: ${prdPath}

You should read the PRD.md file from this path and update it based on the review feedback.

## Review Feedback

**Review Summary**: ${reviewResult.reviewSummary}

**User Feedback**: ${reviewResult.userFeedback || 'No specific feedback provided'}

**Modifications**: ${
      hasModifications
        ? JSON.stringify(reviewResult.modifications, null, 2)
        : 'No modifications requested - but user feedback indicates changes are needed'
    }

# TASK

You must update the PRD.md file to incorporate:
1. All user feedback provided
2. All requested modifications
3. Address any concerns or issues raised during the review

**CRITICAL REQUIREMENTS**:
- Read the PRD.md file from the provided path
- Preserve the overall structure and intent of the original PRD
- Incorporate changes naturally and coherently
- Ensure the updated PRD addresses all feedback and modifications
- Keep the markdown formatting consistent
- Maintain document status section (keep as "draft" if not finalized)

## Modification Handling

For each modification request:
1. Find the specified section in the PRD
2. Replace or update the content as requested
3. Ensure the modification flows naturally with the rest of the document
4. Preserve other sections that are not being modified

## Output Format

You must return:
- **updatedPrdContent**: The complete updated PRD.md file content with all modifications applied

**CRITICAL**: 
- Maintain all formatting and structure
- Preserve sections that are not being modified
- Ensure the updated content is coherent and well-formatted
- If document status exists, keep it as "draft" (do not change to finalized)

Read the PRD file and apply the review feedback to update the document.
    `;
  }
}
