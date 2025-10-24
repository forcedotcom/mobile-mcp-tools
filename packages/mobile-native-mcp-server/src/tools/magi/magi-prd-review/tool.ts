/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../logging/logger.js';
import { PRD_REVIEW_TOOL, PRDReviewInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../base/prdAbstractWorkflowTool.js';

export class SFMobileNativePRDReviewTool extends PRDAbstractWorkflowTool<typeof PRD_REVIEW_TOOL> {
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
**Author**: ${input.documentStatus.author}
**Last Modified**: ${input.documentStatus.lastModified}
**Status**: ${input.documentStatus.status}

## PRD Content

${input.prdContent}

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

## Output Format

After completing the review, you must return a JSON object with the following structure:

\`\`\`json
{
  "prdApproved": true,
  "prdModifications": [
    {
      "section": "Functional Requirements",
      "originalContent": "Original requirement text",
      "modifiedContent": "Modified requirement text",
      "modificationReason": "User requested more specific details about error handling"
    }
  ],
  "userFeedback": "The PRD looks good overall, but I'd like more detail on error handling scenarios",
  "reviewSummary": "PRD approved with minor modifications to error handling requirements"
}
\`\`\`

## Decision Options

1. **APPROVE**: Accept the PRD as-is and proceed to finalization
2. **MODIFY**: Request specific changes to sections of the PRD
3. **REJECT**: Reject the PRD and request a complete revision

## Important Notes

- **Approved PRD** will proceed to finalization and become the official requirements document
- **Modified PRD** will be updated with requested changes and may require another review
- **Rejected PRD** will require significant revision and regeneration
- All decisions should be clearly documented for future reference

Begin the review process by presenting the PRD and asking for the user's decision.
    `;
  }
}
