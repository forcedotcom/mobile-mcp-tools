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
    const featureBriefContent = input.featureBrief || 'Feature brief content not found';

    return `
You are facilitating a feature brief review session with the user. Your role is to present the generated feature brief clearly and guide the user through the review process.

## Feature Brief to Review

The following feature brief has been generated from the user's original request:

${featureBriefContent}

## Review Process

Present the feature brief clearly and ask the user to make a decision:

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

## Guidelines

- Present the feature brief in a clear, readable format
- Ask open-ended questions to understand the user's approval or concerns
- If the user wants modifications, capture the specific sections and requested changes
- Ensure all modifications are clearly documented
- Provide a clear summary of the review outcome

## CRITICAL WORKFLOW RULES

**MANDATORY**: You MUST follow these rules exactly:

1. **If the user requests ANY modifications** (even minor ones):
   - You MUST set approved to false
   - You MUST provide the modifications array
   - You MUST NOT modify the feature brief file directly
   - You MUST return control to the workflow to regenerate

2. **If the user approves the feature brief as-is**:
   - You MUST set approved to true
   - You MUST NOT include any modifications in the array
   - The workflow will proceed to requirements generation

3. **ABSOLUTELY FORBIDDEN**:
   - Modifying the feature brief file directly
   - Editing files and then approving
   - Setting approved to true when modifications are requested
   - Bypassing the workflow regeneration process

## Approval Logic

The logic is simple:
- IF user requests modifications: set approved to false, provide modifications array
- IF user approves without changes: set approved to true, omit or empty modifications array

**You cannot approve AND request modifications at the same time.**
If modifications are requested, approval MUST be false so the workflow can regenerate properly.

## What Happens Next

**If approved (approved: true)**:
- Feature brief file is written to disk (first time)
- Workflow proceeds directly to Requirements Generation
- The approved feature brief file will be used for requirements generation

**If modifications requested (approved: false)**:
- Feature brief file is NOT written (content stays in memory)
- Workflow automatically routes to Feature Brief Update Node
- Your modifications and feedback will be passed to the update tool
- A revised feature brief will be created (reusing same feature ID)
- Updated content is stored in state (file still not written)
- The user will review the revised version
- This process repeats until the user approves (then file is written)

**Remember**: You are ONLY reviewing and providing feedback. The workflow handles all file operations automatically. You MUST NOT:
- Modify files directly
- Edit the feature brief file
- Change file contents manually

Begin the review process by presenting the feature brief and asking for the user's approval or requested modifications.
    `;
  }
}
