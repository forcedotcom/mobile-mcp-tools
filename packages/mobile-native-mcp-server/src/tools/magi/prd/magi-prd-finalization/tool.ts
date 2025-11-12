/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, AbstractWorkflowTool } from '@salesforce/magen-mcp-workflow';
import { PRD_FINALIZATION_TOOL, PRDFinalizationInput } from './metadata.js';

export class MagiPRDFinalizationTool extends AbstractWorkflowTool<typeof PRD_FINALIZATION_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, PRD_FINALIZATION_TOOL, 'magi-prd-orchestrator', 'PRDFinalizationTool', logger);
  }

  public handleRequest = async (input: PRDFinalizationInput) => {
    const guidance = this.generatePRDFinalizationGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generatePRDFinalizationGuidance(input: PRDFinalizationInput) {
    const prdPath = input.prdFilePath;

    return `
You are finalizing a PRD that has been approved by the user. Your role is to update the status section to "finalized" while keeping all content exactly as it is.

## PRD File to Finalize

**File Path**: ${prdPath}

You should read the PRD file from this path and update its status to "finalized".

## Finalization Process

The user has approved this PRD. You must:

1. **Read the PRD file** from the provided path
2. **Keep ALL content exactly as it is** - Do NOT modify any content sections
3. **Update ONLY the Status section** - Change status from "draft" to "finalized"
4. **Preserve all formatting** - Maintain all markdown structure and formatting

## CRITICAL REQUIREMENTS

**ABSOLUTELY FORBIDDEN**:
- Modifying any content sections
- Changing any text except the Status section
- Adding or removing any sections
- Altering formatting or structure

**REQUIRED**:
- Read the PRD file from the provided path
- Find the Status section (should be near the top, after the title)
- Change the status value from "draft" to "finalized"
- Keep everything else exactly the same

## Status Update Format

The Status section should be updated to:

\`\`\`markdown
## Status
**Status**: finalized
\`\`\`

The Status section must be near the top of the document, after the title.

## Important Notes

- This is a simple status update operation
- The PRD content has already been approved by the user
- No content changes are needed, only status update
- Once finalized, the workflow will complete

**CRITICAL**: 
- **Do NOT modify the PRD file directly** - The workflow will apply the changes using a separate update tool
    `;
  }
}
