/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger, AbstractWorkflowTool } from '@salesforce/magen-mcp-workflow';
import { GAP_REQUIREMENTS_TOOL, GapRequirementsInput } from './metadata.js';

/**
 * Tool for generating functional requirements based on identified gaps.
 */
export class MagiGapRequirementsTool extends AbstractWorkflowTool<typeof GAP_REQUIREMENTS_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, GAP_REQUIREMENTS_TOOL, 'magi-prd-orchestrator', 'GapRequirementsTool', logger);
  }

  public handleRequest = async (input: GapRequirementsInput) => {
    const guidance = this.generateGapRequirementsGuidance(input);
    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateGapRequirementsGuidance(input: GapRequirementsInput) {
    return `
You are a product requirements analyst tasked with generating additional functional requirements for a Salesforce mobile native app based on identified gaps.

## Feature Brief

**File Path**: ${input.featureBriefPath}

Please read the feature brief file from the path above.

## Current Functional Requirements

**File Path**: ${input.requirementsPath}

Please read the requirements file from the path above.

## Gap Analysis Context

The following gaps have been identified in the current requirements that need to be addressed:

${JSON.stringify(input.identifiedGaps)}

## Your Task

Your task is to generate NEW functional requirements that address the identified gaps. Focus on:

1. **Addressing Critical Gaps**: Prioritize requirements that address critical and high-severity gaps
2. **Building on Existing**: Ensure new requirements complement existing ones without duplication
3. **Completeness**: Generate requirements that fill the identified gaps comprehensively
4. **Integration**: Ensure new requirements integrate well with existing requirements

**Important**: When analyzing existing requirements, focus on **approved requirements** and **modified requirements**. Ignore **rejected requirements** and **out-of-scope requirements** as they have been explicitly excluded from the feature scope.

### Guidelines for Gap-Based Generation:
- Generate new requirements based on the identified gaps
- Use the suggested requirements from the gap analysis as starting points
- Ensure each new requirement addresses at least one identified gap
- Maintain consistency with existing requirements in terms of format and detail level
- Assign appropriate priorities based on gap severity

## Requirements Quality Standards

- **Specific and Actionable**: Each requirement should clearly define what needs to be built
- **Prioritized**: Assign high/medium/low priority based on business value and user impact
- **Categorized**: Group requirements by functional area
- **Comprehensive**: Cover all aspects needed to deliver the feature
- **Unique IDs**: Use format REQ-XXX for requirement IDs

## Categories to Consider

- **UI/UX**: User interface, navigation, user experience flows
- **Data**: Data models, API integration, data persistence, synchronization
- **Security**: Authentication, authorization, data protection, compliance
- **Performance**: App performance, loading times, memory usage, battery optimization
- **Integration**: Salesforce API integration, third-party services, external systems
- **Platform**: iOS/Android specific features, device capabilities, platform guidelines
- **Offline**: Offline functionality, data synchronization, conflict resolution

## Output Requirements

You MUST return the updated requirements markdown:

**updatedRequirementsMarkdown**: Complete updated requirements file content

### Updated Requirements Markdown Format

The updatedRequirementsMarkdown MUST:
- Preserve all existing sections (Approved Requirements, Modified Requirements, Rejected Requirements, Review History)
- Append new requirements to the "Pending Review Requirements" section (or create it if it doesn't exist)
- Maintain the Status section with "draft" status (do not change to approved)
- Use format REQ-XXX for new requirement IDs, ensuring they are unique and don't conflict with existing IDs
- Preserve all existing formatting and structure

**CRITICAL**: 
- The Status section should remain: "## Status\n**Status**: draft"
- All new requirements should be added to the "Pending Review Requirements" section
- Preserve all existing content and structure
- The updatedRequirementsMarkdown field is REQUIRED and must contain the complete updated file content

Focus on addressing the identified gaps while building upon existing requirements.
`;
  }
}
