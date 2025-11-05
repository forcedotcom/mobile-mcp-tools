/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { FEATURE_BRIEF_REVIEW_TOOL, FeatureBriefReviewInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class MagiFeatureBriefReviewTool extends PRDAbstractWorkflowTool<
  typeof FEATURE_BRIEF_REVIEW_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FEATURE_BRIEF_REVIEW_TOOL, 'FeatureBriefReviewTool', logger);
  }

  public handleRequest = async (input: FeatureBriefReviewInput) => {
    const guidance = this.generateFeatureBriefReviewGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateFeatureBriefReviewGuidance(input: FeatureBriefReviewInput) {
    const featureBriefPath = input.featureBriefPath || 'Feature brief path not found';

    return `
You are facilitating a feature brief review session with the user. Your role is to present the generated feature brief clearly and guide the user through the review process.

## Feature Brief to Review

The feature brief has been generated from the user's original request and is located at:

**File Path**: ${featureBriefPath}

## Review Process

Instruct the user to review the feature brief and provide feedback on whether it is approved or if modifications are needed. Ask the user to make a decision:

1. **APPROVE** - Accept the feature brief as-is and proceed to requirements generation
2. **REQUEST MODIFICATIONS** - Ask for specific changes to the feature brief before proceeding

## Review Questions

You should engage with the user to determine:
- Does the feature brief accurately capture the intended functionality?
- Is the scope and purpose clearly defined?
- Are there any missing elements or unclear sections?
- Would the user like to modify any specific parts?

## User Response Options

The user can respond in one of the following ways:
- **"I approve this feature brief"** or **"This looks good, proceed"** - Approve and proceed
- **"I need to modify [section]"** or **"Can we change..."** - Request modifications
- **"This doesn't match what I want"** - Request major revisions

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **You are ONLY collecting feedback** - Do NOT modify the feature brief file directly
2. **Return only the review decisions** - The workflow will apply these changes using a separate update tool
3. **Be specific** - For modifications, provide clear details about what sections need changes and what the new content should be

Begin the review process by reading the feature brief file and asking for the user's approval or requested modifications.
    `;
  }
}
