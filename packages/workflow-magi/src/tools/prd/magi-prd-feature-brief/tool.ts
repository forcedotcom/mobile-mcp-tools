/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { FEATURE_BRIEF_TOOL, FeatureBriefWorkflowInput } from './metadata.js';
import { AbstractMagiPrdTool } from '../abstractMagiPrdTool.js';

export class MagiFeatureBriefGenerationTool extends AbstractMagiPrdTool<typeof FEATURE_BRIEF_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FEATURE_BRIEF_TOOL, 'FeatureBriefGenerationTool', logger);
  }

  public handleRequest = async (input: FeatureBriefWorkflowInput) => {
    const guidance = this.generateFeatureBriefGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateFeatureBriefGuidance(input: FeatureBriefWorkflowInput) {
    return `
# ROLE

You are a highly accurate and precise feature brief generation tool, taking a user utterance
and generating a feature brief in Markdown format along with a recommended feature ID.

# TASK

Generate a comprehensive feature brief from the user utterance and recommend an appropriate feature ID that follows kebab-case naming conventions and is unique among existing feature IDs.

# CONTEXT

## USER UTTERANCE TO ANALYZE
${JSON.stringify(input.userUtterance)}

## EXISTING FEATURE IDs
${JSON.stringify(input.currentFeatureIds)}

# OUTPUT REQUIREMENTS

1. **Feature Brief Markdown**: Generate a concise feature brief in Markdown format following the exact template below.

2. **Recommended Feature ID**: Generate a kebab-case feature ID that:
   - Must start with a lowercase letter (cannot start with a number or hyphen)
   - Is descriptive and meaningful
   - Follows kebab-case format (lowercase letters, numbers, and hyphens only)
   - Is unique and not already in the existing feature IDs list
   - Accurately represents the feature being described

# FEATURE BRIEF TEMPLATE

Follow this exact structure and format for the feature brief:

\`\`\`markdown
# [Feature Title - Use Title Case]

## Status
**Status**: draft

## User Utterance
[The original user utterance that initiated this feature request]

## Overview
[A clear, concise description of the feature and its purpose. Explain what the feature does and why it's needed.]

## Goals
- [Primary goal or objective]
- [Secondary goal if applicable]
- [Any additional goals]

## Scope
[Define what is included in this feature and what is explicitly out of scope]

## Success Criteria
- [Measurable criterion for success]
- [Additional success criteria]
\`\`\`

**Important Formatting Rules:**
- The title must be in Title Case (capitalize major words)
- The Status section must appear immediately after the title
- Status must always be set to "draft" for new feature briefs
- Use proper Markdown formatting throughout
- Keep sections concise but informative
- Use bullet points for Goals and Success Criteria
- Ensure all sections are present, even if brief


# VALIDATION

Ensure the recommended feature ID:
- Must start with a lowercase letter (cannot start with a number or hyphen)
- Contains only lowercase letters, numbers, and hyphens
- Is not already in the currentFeatureIds array
- Is descriptive and meaningful
- Is between 3-50 characters long
    `;
  }
}
