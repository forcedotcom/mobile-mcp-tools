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

export class MagiRequirementsReviewTool extends PRDAbstractWorkflowTool<
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
    return `
You are facilitating a requirements review session with the user. Your role is to review the requirements.md file with the user and facilitate their decisions.

## Current Requirements Document

**File Path**: ${input.requirementsPath}

Please read the requirements.md file from the path above and use it to conduct the review session.

## Review Process

Review each requirement in the document with the user and guide them through decisions. For each requirement, you should:

1. **Display the requirement** clearly (title, description, priority, category)
2. **Ask for user decision** - approve, reject, or modify
3. **If modifying**, ask what specific changes they want to make
4. **Record the decision** and any modification notes

## Finalization Decision

**IMPORTANT**: After completing the review, you MUST ask the user if they want to finalize the requirements and proceed to PRD generation.

The user may choose to:
- **Finalize now**: Proceed to PRD generation despite any gaps, pending approvals, or modifications
- **Continue iteration**: Continue refining requirements (go through gap analysis, apply modifications, etc.)

**Ask the user clearly** if they want to finalize or continue iterating.

## Output Format

After completing the review, you must return feedback about the review decisions:

1. **approvedRequirementIds**: Array of requirement IDs (e.g., ["REQ-001", "REQ-003"]) that were approved in this review session
2. **rejectedRequirementIds**: Array of requirement IDs that were rejected in this review session
3. **modifications**: Optional array of modification requests. Each modification should include:
   - **requirementId**: The ID of the requirement to modify (e.g., "REQ-002")
   - **modificationReason**: Reason for the modification request
   - **requestedChanges**: Object with optional fields:
     - title: New title for the requirement
     - description: New description for the requirement
     - priority: New priority level (high|medium|low)
     - category: New category
4. **userFeedback**: Optional additional feedback or comments from the user
5. **reviewSummary**: Summary of what happened in this review session
6. **userIterationPreference**: Optional boolean indicating if the user wants to finalize:
   - **true**: User wants to finalize and proceed to PRD generation (skip gap analysis and further iterations)
   - **false** or **not provided**: Continue with normal workflow (gap analysis, modifications, etc.)

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **You are ONLY collecting feedback** - Do NOT modify the requirements.md file directly
2. **Return only the review decisions** - The workflow will apply these changes using a separate update tool
3. **Be specific** - Include exact requirement IDs for approved, rejected, and modified requirements
4. **For modifications** - Provide clear details about what changes are requested

## Guidelines

- Be patient and thorough in the review process
- Ask clarifying questions if the user's intent is unclear
- Capture all decisions accurately with correct requirement IDs
- For modifications, get specific details about what should change
- Ensure requirement IDs match exactly what's in the requirements.md file

## Important Notes

- **Approved requirements** will be marked as approved in the requirements.md file
- **Rejected requirements** will be moved to the rejected section
- **Modified requirements** will be updated with the requested changes and linked to their original ID
- All decisions will be applied to the requirements.md file by a separate update tool

**Remember**: You are collecting feedback only. Do NOT return updated requirements.md content. Return only the review decisions as specified in the output format.

Begin the review process by presenting the requirements from the document and asking for the user's decisions.
    `;
  }
}
