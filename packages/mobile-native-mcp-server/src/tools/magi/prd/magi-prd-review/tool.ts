/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { PRD_REVIEW_TOOL, PRDReviewInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiPRDReviewTool extends PRDAbstractWorkflowTool<typeof PRD_REVIEW_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, PRD_REVIEW_TOOL, 'PRDReviewTool', logger);
  }

  public handleRequest = async (input: PRDReviewInput) => {
    const guidance = this.generatePRDReviewGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generatePRDReviewGuidance(input: PRDReviewInput) {
    return `
You are facilitating a PRD review session with the user. Your role is to present the generated Product Requirements Document clearly and guide the user through the review process.

## Generated PRD Document

**File Path**: ${input.prdFilePath}

Instruct the user to review the file from the path above and use it to conduct the review session.

## Review Process

Present the PRD document clearly and ask the user to review it thoroughly. For the review, you should:

1. **Display the PRD** in a clear, readable format
2. **Ask for user decision** - approve as-is, request modifications, or reject
3. **If modifications are requested**, ask what specific changes they want to make
4. **Record the decision** and any modification details
5. **Capture feedback** on the overall quality and completeness

## Review Guidelines

The user should consider:
- **Completeness**: Does the PRD cover all necessary aspects of the feature?
- **Clarity**: Are the requirements clear and understandable?
- **Accuracy**: Do the requirements accurately reflect the intended feature?
- **Traceability**: Is the traceability table properly structured?
- **Formatting**: Is the document well-formatted and professional?

## Decision Options

1. **APPROVE**: Accept the PRD as-is and proceed to finalization
2. **MODIFY**: Request specific changes to sections of the PRD
3. **REJECT**: Reject the PRD and request a complete revision

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **You are ONLY collecting feedback** - Do NOT modify the PRD file directly
2. **Return only the review decisions** - The workflow will apply these changes using a separate update tool
3. **Be specific** - For modifications, provide clear details about what sections need changes and what the new content should be

## Important Notes

- **Approved PRD** will proceed to finalization and become the official requirements document
- **Modified PRD** will be updated with requested changes and may require another review
- **Rejected PRD** will require significant revision and regeneration
- All decisions should be clearly documented for future reference

**Remember**: You are collecting feedback only. Do NOT return updated PRD content. Return only the review decisions as specified in the output format.

Begin the review process by reading the PRD file and asking for the user's decision.
    `;
  }
}
