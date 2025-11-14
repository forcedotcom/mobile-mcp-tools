/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { INITIAL_REQUIREMENTS_TOOL, InitialRequirementsInput } from './metadata.js';
import { AbstractMagiPrdTool } from '../abstractMagiPrdTool.js';

/**
 * Tool for generating initial functional requirements from a feature brief.
 */
export class MagiInitialRequirementsTool extends AbstractMagiPrdTool<
  typeof INITIAL_REQUIREMENTS_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, INITIAL_REQUIREMENTS_TOOL, 'InitialRequirementsTool', logger);
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

Your task is to analyze the feature brief and propose an initial set of functional requirements.

### Guidelines for Initial Generation:
- Generate functional requirements based on the complexity of the feature
- Cover all major functional areas (UI/UX, Data, Security, Performance, etc.)
- Ensure requirements are specific, measurable, and actionable
- Prioritize requirements based on user value and technical dependencies

## Requirements Quality Standards

- **Specific and Actionable**: Each requirement should clearly define what needs to be built
- **Prioritized**: Assign high/medium/low priority based on business value and user impact
- **Categorized**: Group requirements by functional area
- **Comprehensive**: Cover all aspects needed to deliver the feature
- **Unique IDs**: Use format REQ-XXX for requirement IDs

## Categories to Consider

- **UI/UX**: User interface, navigation, user experience flows
- **Data**: Data models, API integration, data persistence, synchronization (do not include technical details about the data model, just the functionality)
- **Security**: Authentication, authorization, data protection, compliance
- **Performance**: App performance, loading times, memory usage, battery optimization
- **Integration**: SDKs integration, third-party services, external systems

## Output Requirements

You MUST return the requirements markdown:

**requirementsMarkdown**: Complete requirements file content in markdown format

### Requirements Markdown Format

The requirementsMarkdown MUST follow this structure:

\`\`\`markdown
# Requirements

**Feature ID:** [feature-id from feature brief]

## Status
**Status**: draft

## Approved Requirements
...

## Modified Requirements
...

## Rejected Requirements
...

## Pending Review Requirements
...

## Review History
...
\`\`\`

**Note**: 
- All generated requirements should be in the "Pending Review Requirements" section
- Approved Requirements, Modified Requirements, and Rejected Requirements sections should be empty initially

**CRITICAL**: 
- Include a Status section near the top with format: "## Status\n**Status**: draft"
- All generated requirements should be in the "Pending Review Requirements" section
- Use format REQ-XXX for requirement IDs (e.g., REQ-001, REQ-002)
- The requirementsMarkdown field is REQUIRED and must contain the complete file content

Focus on comprehensive coverage of the feature brief.
`;
  }
}
