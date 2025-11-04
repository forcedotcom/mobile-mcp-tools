/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { FEATURE_BRIEF_FINALIZATION_TOOL, FeatureBriefFinalizationInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiFeatureBriefFinalizationTool extends PRDAbstractWorkflowTool<
  typeof FEATURE_BRIEF_FINALIZATION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FEATURE_BRIEF_FINALIZATION_TOOL, 'FeatureBriefFinalizationTool', logger);
  }

  public handleRequest = async (input: FeatureBriefFinalizationInput) => {
    const guidance = this.generateFeatureBriefFinalizationGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateFeatureBriefFinalizationGuidance(input: FeatureBriefFinalizationInput) {
    const featureBriefPath = input.featureBriefPath;

    return `
You are finalizing a feature brief that has been approved by the user. Your role is to update the status section to "approved" while keeping all content exactly as it is.

## Feature Brief File to Finalize

**File Path**: ${featureBriefPath}

You should read the feature brief file from this path and update its status to "approved".

## Finalization Process

The user has approved this feature brief. You must:

1. **Read the feature brief file** from the provided path
2. **Keep ALL content exactly as it is** - Do NOT modify any content sections
3. **Update ONLY the Status section** - Change status from "draft" to "approved"
4. **Preserve all formatting** - Maintain all markdown structure and formatting

## CRITICAL REQUIREMENTS

**ABSOLUTELY FORBIDDEN**:
- Modifying any content sections
- Changing any text except the Status section
- Adding or removing any sections
- Altering formatting or structure

**REQUIRED**:
- Read the feature brief file from the provided path
- Find the Status section (should be near the top, after the title)
- Change the status value from "draft" to "approved"
- Keep everything else exactly the same

## Status Update Format

The Status section should be updated to:

\`\`\`markdown
## Status
**Status**: approved
\`\`\`

The Status section must be near the top of the document, after the title and Feature ID.

## Output Format

After finalization, you must return:

1. **finalizedFeatureBriefContent**: The complete feature brief markdown content with:
   - Status section updated to "approved"
   - All other content preserved exactly as-is
   - All formatting and structure maintained

2. **finalizationSummary**: A brief summary confirming that the feature brief has been finalized and is ready for requirements generation

## Important Notes

- This is a simple status update operation
- The feature brief content has already been approved by the user
- No content changes are needed, only status update
- Once finalized, the workflow will proceed to requirements generation

Update the Status section to "approved" while preserving all other content exactly as it is.
    `;
  }
}
