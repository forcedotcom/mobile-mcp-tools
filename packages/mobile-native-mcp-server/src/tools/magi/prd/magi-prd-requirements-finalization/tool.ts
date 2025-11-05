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
    const requirementsPath = input.requirementsPath;

    return `
You are finalizing the requirements document before proceeding to PRD generation. The user has explicitly indicated they want to finalize the requirements, so you must complete the finalization process immediately.

## Current Requirements Document

**File Path**: ${requirementsPath}

Please read the requirements.md file from the path above.

## Finalization Process

Since the user has explicitly requested finalization, you must:

1. **Move ALL pending requirements to Approved** - All requirements in the "Pending Review Requirements" section must be moved to the "Approved Requirements" section
2. **Update Status to "approved"** - Change the Status section from "draft" to "approved"
3. **Preserve all existing content** - Keep all existing approved, rejected, and modified requirements exactly as they are
4. **Remove or empty Pending Review Requirements section** - After moving all pending requirements, the "Pending Review Requirements" section should be empty or removed

## What to Do

1. **Read the requirements.md file** from the provided path
2. **Move all pending requirements** from "Pending Review Requirements" to "Approved Requirements" section
   - Preserve the exact format of each requirement entry
   - Update the Status field of each moved requirement to "Approved"
   - Append them to the existing Approved Requirements section (do not replace existing approved requirements)
3. **Update the Status section** from "draft" to "approved"
4. **Preserve everything else** - All other content, formatting, and structure must remain exactly as-is

## Output Format

After completing the finalization, you must return:

1. **finalizedRequirementsContent**: The complete finalized requirements.md file content that includes:
   - Status section updated to "approved"
   - All pending requirements moved to "Approved Requirements" section
   - "Pending Review Requirements" section empty or removed
   - All existing sections preserved (Approved Requirements, Modified Requirements, Rejected Requirements, Review History)

## Critical Format Preservation Requirements

**STRICTLY PRESERVE EXISTING FORMAT** - Do NOT change the document structure, formatting, or section organization:
- **Preserve all formatting** - Maintain the exact markdown structure, indentation, and formatting from the original file
- **Preserve section order** - Maintain the exact order of sections as they appear in the original file
- **Preserve existing content** - Keep all existing approved, rejected, and modified requirements exactly as they are
- **Preserve the Feature ID** - Do not change the feature ID
- **Match existing format exactly** - Follow the exact format used for requirements entries in the original file (field names, bullet points, spacing, etc.)
- **Only make required changes** - Update Status to "approved" and move pending requirements to approved. Do not modify anything else.

## Status Management

**CRITICAL**: The requirements.md file MUST have its Status section updated:
- **Status Update Format**: "## Status\n**Status**: approved"
- **The Status section must be near the top**, after the title and Feature ID

## Important Notes

- The user has explicitly indicated they want to finalize the requirements - no further iteration is needed
- All pending requirements should be automatically moved to approved
- This is the final step before PRD generation
- Once finalized, the requirements document will be used to generate the PRD

Read the requirements file, move all pending requirements to approved, update the status to "approved", and return the finalized document.
    `;
  }
}
