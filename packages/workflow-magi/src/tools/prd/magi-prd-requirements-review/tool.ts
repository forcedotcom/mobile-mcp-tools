/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { REQUIREMENTS_REVIEW_TOOL, RequirementsReviewInput } from './metadata.js';
import { AbstractMagiPrdTool } from '../abstractMagiPrdTool.js';

export class MagiRequirementsReviewTool extends AbstractMagiPrdTool<
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
You are facilitating a requirements review session with the user. Your role is to review the requirements file with the user and facilitate their decisions.

## Current Requirements Document

**File Path**: ${input.requirementsPath}

Instruct the user to review the requirements file and provide feedback on whether it is approved or if modifications are needed.

## Review Process

Review each requirement in the document with the user and guide them through decisions. For each requirement, you should:

1. **Display the requirement** clearly (title, description, priority, category)
2. **Ask for user decision** - approve, reject, or modify
3. **If modifying**, ask what specific changes they want to make
4. **Record the decision** and any modification notes

## Finalization Decision

**IMPORTANT**: After completing the review, you MUST ask the user if they want to finalize the requirements and proceed to PRD generation.

**CRITICAL**: You MUST clearly inform the user about what happens when they choose to finalize:

If the user chooses to finalize:
- **ALL pending requirements will be automatically marked as approved** - Any requirements still in the "Pending Review Requirements" section will be moved to "Approved Requirements" and marked as approved
- **The document status will be changed from "draft" to "approved"** - The requirements document will be finalized
- **The workflow will proceed to PRD generation** - No further iteration on requirements will be possible

The user may choose to:
- **Finalize now**: Proceed to PRD generation. **All pending requirements will be automatically approved** and the document will be finalized.
- **Continue iteration**: Continue refining requirements (go through gap analysis, apply modifications, etc.) before finalizing

**You MUST explicitly state**: "If you choose to finalize now, any remaining pending requirements will be automatically marked as approved and the document will be finalized. Are you ready to finalize, or would you like to continue iterating?"

**Ask the user clearly** if they want to finalize or continue iterating, making sure they understand the consequences of finalizing.

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **You are ONLY collecting feedback** - Do NOT modify the requirements file directly
2. **Return only the review decisions** - The workflow will apply these changes using a separate update tool
3. **Be specific** - Include exact requirement IDs for approved, rejected, and modified requirements
4. **For modifications** - Provide clear details about what changes are requested

## Guidelines

- Be patient and thorough in the review process
- Ask clarifying questions if the user's intent is unclear
- Capture all decisions accurately with correct requirement IDs
- For modifications, get specific details about what should change
- Ensure requirement IDs match exactly what's in the requirements file

## Important Notes

- **Approved requirements** will be marked as approved in the requirements file
- **Rejected requirements** will be moved to the rejected section
- **Modified requirements** will be updated with the requested changes and linked to their original ID
- All decisions will be applied to the requirements file by a separate update tool

**Remember**: You are collecting feedback only. Do NOT return updated requirements content. Return only the review decisions as specified in the output format.

Begin the review process by presenting the requirements from the document and asking for the user's decisions.
    `;
  }
}
