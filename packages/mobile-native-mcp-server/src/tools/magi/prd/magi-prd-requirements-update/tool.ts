/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { REQUIREMENTS_UPDATE_TOOL, RequirementsUpdateInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiRequirementsUpdateTool extends PRDAbstractWorkflowTool<
  typeof REQUIREMENTS_UPDATE_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, REQUIREMENTS_UPDATE_TOOL, 'RequirementsUpdateTool', logger);
  }

  public handleRequest = async (input: RequirementsUpdateInput) => {
    const guidance = this.generateRequirementsUpdateGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateRequirementsUpdateGuidance(input: RequirementsUpdateInput) {
    const requirementsPath = input.requirementsPath;
    const reviewResult = input.reviewResult;
    const hasModifications = reviewResult.modifications && reviewResult.modifications.length > 0;

    return `
# ROLE

You are a requirements update tool. Your task is to update an EXISTING requirements.md file based on review feedback. You must read the current requirements file, apply the review decisions, and return the updated content.

# CONTEXT

## Requirements File to Update

**File Path**: ${requirementsPath}

You should read the requirements.md file from this path and update it based on the review feedback.

## Review Feedback

**Review Summary**: ${reviewResult.reviewSummary}

**User Feedback**: ${reviewResult.userFeedback || 'No specific feedback provided'}

**Approved Requirement IDs**: ${JSON.stringify(reviewResult.approvedRequirementIds)}

**Rejected Requirement IDs**: ${JSON.stringify(reviewResult.rejectedRequirementIds)}

**Modifications**: ${
      hasModifications
        ? JSON.stringify(reviewResult.modifications, null, 2)
        : 'No modifications requested'
    }

# TASK

You must update the requirements.md file to:

1. **Move approved requirements** from "Pending Review Requirements" to "Approved Requirements" section
2. **Move rejected requirements** from "Pending Review Requirements" to "Rejected Requirements" section
3. **Apply modifications**:
   - For requirements with modification requests:
     - Move the original requirement to "Rejected Requirements" or keep it and mark as modified
     - Create a new requirement entry in "Modified Requirements" section with:
       - Original ID reference (e.g., "Original ID: REQ-002")
       - Updated fields based on requestedChanges
       - Modification Notes explaining what changed
       - Status: "Approved (Modified)"
4. **Update Review History**:
   - Add a new entry to the "Review History" section with:
     - Timestamp (ISO format)
     - Summary: The reviewSummary from the feedback
     - Approved IDs: Comma-separated list of approved requirement IDs
     - Rejected IDs: Comma-separated list of rejected requirement IDs
     - Modified IDs: Comma-separated list of modified requirement IDs

# CRITICAL REQUIREMENTS

- **Read the requirements.md file** from the provided path first
- **Preserve existing content** - Keep all existing approved, rejected, and modified requirements
- **Preserve the Feature ID** - Do not change the feature ID
- **Maintain Status section** - Keep Status as "draft" (do not change to approved)
- **Preserve all formatting** - Maintain markdown structure and formatting
- **Add to existing sections** - Append new approved/rejected/modified requirements to existing sections
- **Update Review History** - Add new entry to existing review history, don't replace it

## Requirements.md File Structure

The requirements.md file should follow this structure:

\`\`\`markdown
# Requirements

**Feature ID:** [feature-id]

## Status
**Status**: draft

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

## Pending Review Requirements

(Any requirements still pending review)

## Review History

### [timestamp]
- **Summary**: [summary of review]
- **Approved IDs**: [comma-separated IDs]
- **Rejected IDs**: [comma-separated IDs]
- **Modified IDs**: [comma-separated IDs]
\`\`\`

## Modification Handling

For each modification request:
1. Find the requirement by ID in the "Pending Review Requirements" section
2. Create a new requirement entry in "Modified Requirements" section with:
   - A new ID (e.g., if REQ-002 was modified, create REQ-002-MODIFIED or similar)
   - Original ID field pointing to the original requirement
   - Updated fields from requestedChanges (only include fields that were actually changed)
   - Modification Notes explaining what changed and why
   - Status: "Approved (Modified)"
3. Remove the original requirement from "Pending Review Requirements" (or move to rejected if needed)

## Output Format

You must return:
- **updatedRequirementsContent**: The complete updated requirements.md file content with all review decisions applied

**CRITICAL**: 
- Include a Status section near the top with format: "## Status\n**Status**: draft"
- Status MUST remain "draft" (do not change to approved)
- Preserve all existing content and add new entries
- All formatting and structure must be maintained

Read the requirements file and apply the review feedback to update the document.
    `;
  }
}
