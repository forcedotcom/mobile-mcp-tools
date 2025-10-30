/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { GAP_ANALYSIS_TOOL, GapAnalysisInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

/**
 * Tool for analyzing requirements against a feature brief to identify gaps.
 */
export class SFMobileNativeGapAnalysisTool extends PRDAbstractWorkflowTool<
  typeof GAP_ANALYSIS_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, GAP_ANALYSIS_TOOL, 'GapAnalysisTool', logger);
  }

  public handleRequest = async (input: GapAnalysisInput) => {
    const guidance = this.generateGapAnalysisGuidance(input);
    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateGapAnalysisGuidance(input: GapAnalysisInput) {
    return `
You are a requirements analysis expert conducting a gap analysis for a Salesforce mobile native app. Analyze the current functional requirements against the feature brief to identify gaps, assess requirement strengths, and provide recommendations.

## Feature Brief

${input.featureBrief}

## Current Functional Requirements

${input.requirementsContent}

## Your Task

Conduct a comprehensive gap analysis examining:

1. **Coverage**: Does each aspect of the feature brief have corresponding requirements?
2. **Completeness**: Are all necessary components, flows, and edge cases covered?
3. **Clarity**: Are requirements specific, measurable, and actionable?
4. **Feasibility**: Are requirements realistic for a mobile native app?
5. **Salesforce Integration**: Are Salesforce-specific capabilities properly addressed?
6. **User Experience**: Are user flows and interactions properly defined?

**Important**: When analyzing requirements, focus on **approved requirements** and **modified requirements**. Ignore **rejected requirements** and **out-of-scope requirements** as they have been explicitly excluded from the feature scope.

After presenting the gap analysis results, **ASK THE USER** if they want to:
- Continue refining requirements to address the identified gaps, OR
- Proceed to PRD generation despite the gaps (useful when gaps are minor or acceptable)

The user should make an informed decision based on the gap analysis findings.

## Field Requirements and Guidance

**IMPORTANT**: The output schema will be provided to you separately. Ensure ALL required fields are included in your response. Pay special attention to the following:

### Gap Objects (\`identifiedGaps\` array)

Each gap object **MUST** include ALL required fields. Key guidance:
- **id**: Use format "GAP-001", "GAP-002", etc. for unique identifiers
- **title**: Provide a clear, concise title summarizing the gap (REQUIRED - do not omit this field)
- **description**: Explain what functionality or requirement is missing
- **severity**: Choose appropriate severity level based on impact
- **category**: Categorize the gap (e.g., "Data", "UI/UX", "Security", "Performance")
- **impact**: Explain the consequences if this gap is not addressed
- **suggestedRequirements**: Provide actionable suggestions, each with:
  - **title**: Clear title for the suggested requirement
  - **description**: Detailed description of what should be implemented
  - **priority**: Appropriate priority level
  - **category**: Relevant category

### Other Required Fields

- **gapAnalysisScore**: Overall score from 0-100 (higher is better)
- **requirementStrengths**: Analysis of individual requirement quality
- **recommendations**: High-level improvement recommendations
- **summary**: Comprehensive summary of findings
- **userWantsToContinueDespiteGaps**: Set to:
- **true** if the user wants to continue refining requirements to address gaps
- **false** if the user wants to proceed to PRD generation despite the gaps
- **Leave it out** if you couldn't get a clear user decision (will default to false)

## Analysis Guidelines

### Severity Assessment
- **Critical**: Fundamental functionality missing
- **High**: Important functionality missing that significantly impacts user experience
- **Medium**: Nice-to-have functionality missing
- **Low**: Minor enhancements missing

### Requirement Strength Scoring (0-10)
- **9-10**: Excellent - Clear, complete, actionable, well-prioritized
- **7-8**: Good - Mostly clear with minor gaps
- **5-6**: Fair - Adequate but needs improvement
- **3-4**: Poor - Significant gaps
- **0-2**: Very Poor - Unclear, incomplete, or not actionable

Provide detailed, actionable feedback to improve requirements quality and completeness.
`;
  }
}
