/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { FEATURE_BRIEF_TOOL, FeatureBriefWorkflowInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiFeatureBriefGenerationTool extends PRDAbstractWorkflowTool<
  typeof FEATURE_BRIEF_TOOL
> {
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

1. **Feature Brief Markdown**: Generate a concise feature brief in Markdown format that includes:
   - Original user utterance
   - Feature overview and purpose

2. **Recommended Feature ID**: Generate a kebab-case feature ID that:
   - Is descriptive and meaningful
   - Follows kebab-case format (lowercase letters, numbers, and hyphens only)
   - Is unique and not already in the existing feature IDs list
   - Accurately represents the feature being described

# EXAMPLES

- User utterance: "Add user authentication with login and logout"
- Recommended feature ID: "user-authentication"
- User utterance: "Implement push notifications for order updates"
- Recommended feature ID: "push-notifications"
- User utterance: "Create a shopping cart with add/remove items"
- Recommended feature ID: "shopping-cart"

# VALIDATION

Ensure the recommended feature ID:
- Contains only lowercase letters, numbers, and hyphens
- Is not already in the currentFeatureIds array
- Is descriptive and meaningful
- Is between 3-50 characters long
    `;
  }
}
