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
export class MagiGapAnalysisTool extends PRDAbstractWorkflowTool<typeof GAP_ANALYSIS_TOOL> {
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
You are a requirements analysis expert conducting a gap analysis for a Salesforce mobile native app. Analyze the current functional requirements against the feature brief to identify gaps and provide recommendations.

## Feature Brief

**File Path**: ${input.featureBriefPath}

Please read the feature brief file from the path above.

## Current Functional Requirements

**File Path**: ${input.requirementsPath}

Please read the requirements file from the path above.

## Your Task

Conduct a comprehensive gap analysis examining:

1. **Coverage**: Does each aspect of the feature brief have corresponding requirements?
2. **Completeness**: Are all necessary components, flows, and edge cases covered?
3. **Clarity**: Are requirements specific, measurable, and actionable?
4. **Feasibility**: Are requirements realistic for a mobile native app?
5. **Salesforce Integration**: Are Salesforce-specific capabilities properly addressed?
6. **User Experience**: Are user flows and interactions properly defined?

**Important**: When analyzing requirements, focus on **approved requirements** and **modified requirements**. Ignore **rejected requirements** and **out-of-scope requirements** as they have been explicitly excluded from the feature scope.

## Analysis Guidelines

### Severity Assessment
- **Critical**: Fundamental functionality missing
- **High**: Important functionality missing that significantly impacts user experience
- **Medium**: Nice-to-have functionality missing
- **Low**: Minor enhancements missing

### Gap Analysis Evaluation
Provide a textual evaluation of the overall requirements quality based on:
- **Coverage**: How well requirements cover the feature brief
- **Completeness**: Whether all necessary components and flows are covered
- **Clarity**: Whether requirements are specific, measurable, and actionable
- **Feasibility**: Whether requirements are realistic for mobile native app

**Evaluation Levels:**
- **Excellent**: Requirements are comprehensive and well-defined, covering all aspects of the feature brief with clarity and feasibility
- **Good**: Requirements are mostly complete with minor gaps or areas that could be improved
- **Fair**: Requirements have some notable gaps but are workable and address the core functionality
- **Poor**: Requirements have significant gaps that need substantial attention before proceeding

Provide detailed, actionable feedback to improve requirements quality and completeness.
`;
  }
}
