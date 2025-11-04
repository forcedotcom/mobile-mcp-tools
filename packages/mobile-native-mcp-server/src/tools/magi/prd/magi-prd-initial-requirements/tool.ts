/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { INITIAL_REQUIREMENTS_TOOL, InitialRequirementsInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';
import { RequirementsBaseUtility } from '../shared/requirementsBaseUtility.js';

/**
 * Tool for generating initial functional requirements from a feature brief.
 */
export class MagiInitialRequirementsTool extends PRDAbstractWorkflowTool<
  typeof INITIAL_REQUIREMENTS_TOOL
> {
  private requirementsUtility: RequirementsBaseUtility;

  constructor(server: McpServer, logger?: Logger) {
    super(server, INITIAL_REQUIREMENTS_TOOL, 'InitialRequirementsTool', logger);
    this.requirementsUtility = new RequirementsBaseUtility();
  }

  public handleRequest = async (input: InitialRequirementsInput) => {
    const guidance = this.generateInitialRequirementsGuidance(input.featureBriefPath);
    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateInitialRequirementsGuidance(featureBriefPath: string) {
    return `
You are a product requirements analyst tasked with generating initial functional requirements for a Salesforce mobile native app.

## Feature Brief

**File Path**: ${featureBriefPath}

Please read the feature brief file from the path above and use it to generate the initial functional requirements.

## Your Task

Your task is to analyze the feature brief and propose an initial set of functional requirements. Focus on:

1. **Comprehensive Coverage**: Ensure all aspects of the feature brief are covered
2. **Mobile Native Focus**: Consider mobile-specific capabilities and constraints
3. **Salesforce Integration**: Leverage Salesforce-specific capabilities appropriately
4. **User Experience**: Include requirements for intuitive user interactions

### Guidelines for Initial Generation:
- Generate 5-15 functional requirements based on the complexity of the feature
- Cover all major functional areas (UI/UX, Data, Security, Performance, etc.)
- Ensure requirements are specific, measurable, and actionable
- Prioritize requirements based on user value and technical dependencies

${this.requirementsUtility.generateCommonRequirementsGuidance()}

## Output Requirements

You MUST return the requirements markdown:

**requirementsMarkdown**: Complete requirements.md file content in markdown format

### Requirements Markdown Format

The requirementsMarkdown MUST follow this structure:

\`\`\`markdown
# Requirements

**Feature ID:** [feature-id from feature brief]

## Status
**Status**: draft

## Approved Requirements

(Empty - requirements are pending review)

## Modified Requirements

(Empty - no modifications yet)

## Rejected Requirements

(Empty - no rejections yet)

## Pending Review Requirements

### [REQ-001]: [Title]
- **Priority**: [high|medium|low]
- **Category**: [category]
- **Description**: [description]
- **Status**: Pending Review

### [REQ-002]: [Title]
...
\`\`\`

**CRITICAL**: 
- Include a Status section near the top with format: "## Status\n**Status**: draft"
- All generated requirements should be in the "Pending Review Requirements" section
- Use format REQ-XXX for requirement IDs (e.g., REQ-001, REQ-002)
- The requirementsMarkdown field is REQUIRED and must contain the complete file content

Focus on comprehensive coverage of the feature brief.
`;
  }
}
