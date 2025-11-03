/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { REQUIREMENTS_REVIEW_TOOL, RequirementsReviewInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class SFMobileNativeRequirementsReviewTool extends PRDAbstractWorkflowTool<
  typeof REQUIREMENTS_REVIEW_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, REQUIREMENTS_REVIEW_TOOL, 'RequirementsReviewTool', logger);
  }

  public handleRequest = async (input: RequirementsReviewInput) => {
    const guidance = this.generateRequirementsReviewGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateRequirementsReviewGuidance(input: RequirementsReviewInput) {
    const requirementsContent = input.requirementsContent || '# Requirements\n\nNo requirements have been generated yet.';

    return `
You are facilitating a requirements review session with the user. Your role is to review the requirements.md file with the user and facilitate their decisions.

## Current Requirements Document

The following is the current requirements.md file content:

\`\`\`markdown
${requirementsContent}
\`\`\`

## Review Process

Review each requirement in the document with the user and guide them through decisions. For each requirement, you should:

1. **Display the requirement** clearly (title, description, priority, category)
2. **Ask for user decision** - approve, reject, or modify
3. **If modifying**, ask what specific changes they want to make
4. **Record the decision** and any modification notes

## Output Format

After completing the review, you must return:
1. **updatedRequirementsContent**: The complete updated requirements.md file content that includes:
   - All approved requirements (keep existing ones, add any newly approved)
   - All rejected requirements (keep existing ones, add any newly rejected)
   - All modified requirements (keep existing ones, add any newly modified with originalId and modificationNotes)
   - Review history section with a new entry documenting this review session (timestamp, summary, approved/rejected/modified IDs)

2. **reviewSummary**: A summary of what happened in this review session

## Requirements.md File Structure

The requirements.md file should follow this structure:

\`\`\`markdown
# Requirements

**Feature ID:** [feature-id]

## Approved Requirements

### [REQ-ID]: [Title]
- **Priority**: [high|medium|low]
- **Category**: [category]
- **Description**: [description]
- **Status**: Approved

## Modified Requirements

### [REQ-ID]: [Title]
- **Original ID**: [original-id]
- **Priority**: [high|medium|low]
- **Category**: [category]
- **Description**: [description]
- **Modification Notes**: [notes]
- **Status**: Approved (Modified)

## Rejected Requirements

### [REQ-ID]: [Title]
- **Priority**: [high|medium|low]
- **Category**: [category]
- **Description**: [description]
- **Status**: Rejected

## Review History

### [timestamp]
- **Summary**: [summary of review]
- **Approved IDs**: [comma-separated IDs]
- **Rejected IDs**: [comma-separated IDs]
- **Modified IDs**: [comma-separated IDs]
\`\`\`

## Guidelines

- Preserve existing requirements and review history - only add new entries or update existing ones based on user decisions
- Maintain the markdown structure and formatting
- Be patient and thorough in the review process
- Ask clarifying questions if the user's intent is unclear
- Ensure all requirements are properly categorized (approved/rejected/modified)
- Capture any modification details accurately
- Use ISO format timestamps for review history entries

## Important Notes

- **Approved requirements** will be included in the project scope
- **Rejected requirements** will be marked as out of scope
- **Modified requirements** will be updated with the user's changes and linked to their original ID
- All decisions should be clearly documented in the review history section

Begin the review process by presenting the requirements from the document and asking for the user's decisions.
    `;
  }
}
