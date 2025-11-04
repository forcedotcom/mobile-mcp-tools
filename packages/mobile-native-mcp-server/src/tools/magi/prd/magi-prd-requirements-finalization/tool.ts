/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { REQUIREMENTS_FINALIZATION_TOOL, RequirementsFinalizationInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiRequirementsFinalizationTool extends PRDAbstractWorkflowTool<
  typeof REQUIREMENTS_FINALIZATION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, REQUIREMENTS_FINALIZATION_TOOL, 'RequirementsFinalizationTool', logger);
  }

  public handleRequest = async (input: RequirementsFinalizationInput) => {
    const guidance = this.generateRequirementsFinalizationGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateRequirementsFinalizationGuidance(input: RequirementsFinalizationInput) {
    const requirementsContent =
      input.requirementsContent || '# Requirements\n\nNo requirements found.';

    return `
You are facilitating the finalization of requirements before proceeding to PRD generation. Your role is to ensure all requirements have been properly reviewed and to finalize the requirements document.

## Current Requirements Document

The following is the current requirements.md file content:

\`\`\`markdown
${requirementsContent}
\`\`\`

## Finalization Process

Before we can proceed to PRD generation, you must ensure that:

1. **All pending requirements have been reviewed** - Check if there are any requirements in the "Pending Review Requirements" section
2. **All requirements are properly categorized** - Requirements should be in one of: Approved Requirements, Modified Requirements, or Rejected Requirements sections
3. **Status is updated to "approved"** - Once all requirements are reviewed, the document status should be updated from "draft" to "approved"

## What to Do

### If there are pending requirements:
- Present any remaining pending requirements to the user
- Ask the user to approve, reject, or modify each pending requirement
- Move reviewed requirements to the appropriate section (Approved, Modified, or Rejected)
- Once all pending requirements are reviewed, update status to "approved"

### If all requirements are already reviewed:
- Confirm with the user that the requirements document is complete
- Update the Status section from "draft" to "approved"
- Provide a summary of the finalized requirements

## Output Format

After completing the finalization, you must return:

1. **finalizedRequirementsContent**: The complete finalized requirements.md file content that includes:
   - Status section updated to "approved"
   - All requirements properly categorized (no pending requirements remaining)
   - All existing sections preserved (Approved Requirements, Modified Requirements, Rejected Requirements, Review History)

## Requirements.md File Structure

The finalized requirements.md file should follow this structure:

\`\`\`markdown
# Requirements

**Feature ID:** [feature-id]

## Status
**Status**: approved

## Approved Requirements
...

## Modified Requirements
...

## Rejected Requirements
...

## Review History
...
\`\`\`

## Status Management

**CRITICAL**: The requirements.md file MUST have its Status section updated:

- **Current Status**: Check the current status in the document
- **If status is "draft"**: You MUST update it to "approved" after ensuring all requirements are reviewed
- **Status Update Format**: "## Status\n**Status**: approved"
- **The Status section must be near the top**, after the title and Feature ID

## Guidelines

- Be thorough - ensure no requirements are left in "Pending Review Requirements"
- If there are pending requirements, review them with the user before finalizing
- Maintain all existing structure and formatting
- Preserve all review history
- Confirm with the user that requirements are ready for PRD generation

## Important Notes

- This is the final step before PRD generation
- Once finalized, the requirements document will be used to generate the PRD
- All requirements must be properly categorized (approved/modified/rejected) before finalization
- The document status must be "approved" before proceeding

Begin the finalization process by reviewing the current requirements document and checking for any pending requirements.
    `;
  }
}
