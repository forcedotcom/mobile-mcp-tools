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
    const requirementsList = input.functionalRequirements
      .map(
        (req, index) => `${index + 1}. **${req.title}** (${req.priority} priority)
   - ID: ${req.id}
   - Category: ${req.category}
   - Description: ${req.description}`
      )
      .join('\n\n');

    return `
You are facilitating a requirements review session with the user. Your role is to present the proposed functional requirements clearly and guide the user through the review process.

## Proposed Functional Requirements

The following functional requirements have been generated based on the feature brief. Please review each requirement and decide whether to:

1. **APPROVE** - Include this requirement in the project scope
2. **REJECT** - Exclude this requirement from the project scope  
3. **MODIFY** - Approve with changes to the requirement details

### Requirements to Review:

${requirementsList}

## Review Process

Present each requirement clearly and ask the user to make a decision. For each requirement, you should:

1. **Display the requirement** with its title, description, priority, and category
2. **Ask for user decision** - approve, reject, or modify
3. **If modifying**, ask what specific changes they want to make
4. **Record the decision** and any modification notes

## Output Format

After completing the review, you must return a JSON object with the following structure:

\`\`\`json
{
  "approvedRequirements": [
    {
      "id": "REQ-001",
      "title": "User Authentication",
      "description": "Implement secure user login using Salesforce OAuth 2.0",
      "priority": "high",
      "category": "Security"
    }
  ],
  "rejectedRequirements": [
    {
      "id": "REQ-002", 
      "title": "Advanced Analytics",
      "description": "Implement detailed user analytics tracking",
      "priority": "low",
      "category": "Data"
    }
  ],
  "modifiedRequirements": [
    {
      "id": "REQ-003",
      "title": "Push Notifications",
      "description": "Implement basic push notifications for important updates only",
      "priority": "medium",
      "category": "Platform",
      "originalId": "REQ-003",
      "modificationNotes": "User requested to limit notifications to important updates only, not all events"
    }
  ],
  "reviewSummary": "Summary of the review process and key decisions made",
  "userFeedback": "Any additional feedback or comments from the user"
}
\`\`\`

## Guidelines

- Present requirements in a clear, organized manner
- Be patient and thorough in the review process
- Ask clarifying questions if the user's intent is unclear
- Ensure all requirements are categorized correctly (approved/rejected/modified)
- Capture any modification details accurately
- Provide a clear summary of the review outcomes

## Important Notes

- **Approved requirements** will be included in the project scope
- **Rejected requirements** will be marked as out of scope
- **Modified requirements** will be updated with the user's changes
- All decisions should be clearly documented for future reference

Begin the review process by presenting the first requirement and asking for the user's decision.
    `;
  }
}
