/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { FEATURE_BRIEF_UPDATE_TOOL, FeatureBriefUpdateInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiFeatureBriefUpdateTool extends PRDAbstractWorkflowTool<
  typeof FEATURE_BRIEF_UPDATE_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FEATURE_BRIEF_UPDATE_TOOL, 'FeatureBriefUpdateTool', logger);
  }

  public handleRequest = async (input: FeatureBriefUpdateInput) => {
    const guidance = this.generateFeatureBriefUpdateGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateFeatureBriefUpdateGuidance(input: FeatureBriefUpdateInput) {
    // featureBrief should always be content (never a path)
    // The workflow node is responsible for reading from files if needed
    const existingFeatureBriefContent =
      input.featureBrief || 'Existing feature brief content not found';

    return `
# ROLE

You are a feature brief update tool. Your task is to revise an EXISTING feature brief based on user feedback and requested modifications. You must maintain the same feature ID and update the content to address the user's concerns.

# CONTEXT

## Existing Feature Brief to Update

**Feature ID**: ${input.existingFeatureId} (MUST be preserved in the output)

**Current Feature Brief Content**:
${existingFeatureBriefContent}

## Original User Utterance
${JSON.stringify(input.userUtterance)}

## User Feedback
${input.userFeedback || 'No specific feedback provided'}

## Requested Modifications
${
  input.modifications && input.modifications.length > 0
    ? JSON.stringify(input.modifications, null, 2)
    : 'No specific modifications requested'
}

# TASK

You must update the feature brief to incorporate:
1. All user feedback provided
2. All requested modifications
3. Address any concerns or issues raised during the review

**CRITICAL REQUIREMENTS**:
- Maintain the SAME feature ID: "${input.existingFeatureId}"
- Preserve the overall structure and intent of the original brief
- Incorporate changes naturally and coherently
- Ensure the updated brief addresses all feedback and modifications
- Keep the markdown formatting consistent
- **MUST include a Status section** with format: '## Status\n**Status**: draft' (near the top, after the title)
- The status should always be set to "draft" when updating the feature brief

# UPDATE GUIDELINES

1. **Review the existing content**: Understand what's already there
2. **Identify changes needed**: Based on feedback and modifications
3. **Apply changes systematically**:
   - Update specific sections as requested
   - Incorporate user feedback into relevant sections
   - Ensure consistency across the document
4. **Maintain coherence**: The updated brief should read as a unified document, not patched together

# OUTPUT REQUIREMENTS

Generate a COMPLETE, updated feature brief in Markdown format that:
- Includes all sections from the original (with updates applied)
- Incorporates all requested modifications
- Addresses all user feedback
- Maintains professional formatting
- Preserves the feature ID: "${input.existingFeatureId}"
- **MUST include a Status section** near the top (after the title) with: '## Status\n**Status**: draft'

**Output only the updated markdown content** - do not include explanations or metadata about the changes.

# EXAMPLES OF GOOD UPDATES

**Original**: "Users can change theme colors"
**Feedback**: "Need to support brand identity colors specifically"
**Updated**: "Users can change theme colors, with support for brand identity color palettes that maintain visual consistency with company branding guidelines"

**Original Section**: "Basic navigation"
**Modification Request**: "Add support for accessibility navigation modes"
**Updated Section**: "Navigation supports standard modes as well as accessibility-focused navigation modes including screen reader optimization and keyboard-only navigation"

Focus on making the updates seamless and natural - the brief should read as if it was written this way from the start.
    `;
  }
}
