/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import { FUNCTIONAL_REQUIREMENTS_TOOL, FunctionalRequirementsInput } from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';

export class SFMobileNativeFunctionalRequirementsTool extends PRDAbstractWorkflowTool<
  typeof FUNCTIONAL_REQUIREMENTS_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, FUNCTIONAL_REQUIREMENTS_TOOL, 'FunctionalRequirementsTool', logger);
  }

  public handleRequest = async (input: FunctionalRequirementsInput) => {
    const guidance = this.generateFunctionalRequirementsGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateFunctionalRequirementsGuidance(input: FunctionalRequirementsInput) {
    const isGapBased =
      input.isGapBasedGeneration && input.identifiedGaps && input.identifiedGaps.length > 0;

    let contextSection = '';
    let analysisInstructions = '';

    if (isGapBased) {
      // Gap-based generation context
      const gapsList = input
        .identifiedGaps!.map(
          (gap, index) => `${index + 1}. **${gap.title}** (${gap.severity} severity)
   - ID: ${gap.id}
   - Category: ${gap.category}
   - Description: ${gap.description}
   - Impact: ${gap.impact}
   - Suggested Requirements: ${gap.suggestedRequirements.map(req => req.title).join(', ')}`
        )
        .join('\n\n');

      const existingRequirementsList =
        input.existingRequirements
          ?.map(
            (req, index) => `${index + 1}. **${req.title}** (${req.priority} priority) - ${req.id}`
          )
          .join('\n') || 'None';

      contextSection = `
## Gap Analysis Context

The following gaps have been identified in the current requirements that need to be addressed:

${gapsList}

## Existing Requirements

The following requirements already exist and should NOT be duplicated:

${existingRequirementsList}
`;

      analysisInstructions = `
## Gap-Based Requirements Generation

Your task is to generate NEW functional requirements that address the identified gaps. Focus on:

1. **Addressing Critical Gaps**: Prioritize requirements that address critical and high-severity gaps
2. **Building on Existing**: Ensure new requirements complement existing ones without duplication
3. **Completeness**: Generate requirements that fill the identified gaps comprehensively
4. **Integration**: Ensure new requirements integrate well with existing requirements

### Guidelines for Gap-Based Generation:
- Generate 3-8 new requirements based on the identified gaps
- Use the suggested requirements from the gap analysis as starting points
- Ensure each new requirement addresses at least one identified gap
- Maintain consistency with existing requirements in terms of format and detail level
- Assign appropriate priorities based on gap severity
`;
    } else {
      // Initial generation context
      contextSection = `
## Feature Brief

${input.featureBrief}
`;

      analysisInstructions = `
## Initial Requirements Generation

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
`;
    }

    return `
You are a product requirements analyst tasked with generating functional requirements for a Salesforce mobile native app.

${contextSection}

## Your Task

${analysisInstructions}

## Output Format

You must return a JSON object with the following structure:

\`\`\`json
{
  "functionalRequirements": [
    {
      "id": "REQ-001",
      "title": "User Authentication",
      "description": "Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO",
      "priority": "high",
      "category": "Security"
    }
  ],
  "summary": "Brief summary of the proposed requirements and their overall scope",
  "generationType": "${isGapBased ? 'gap-based' : 'initial'}",
  "gapsAddressed": ${isGapBased ? '["GAP-001", "GAP-002"]' : 'null'}
}
\`\`\`

## Categories to Consider

- **UI/UX**: User interface, navigation, user experience flows
- **Data**: Data models, API integration, data persistence, synchronization
- **Security**: Authentication, authorization, data protection, compliance
- **Performance**: App performance, loading times, memory usage, battery optimization
- **Integration**: Salesforce API integration, third-party services, external systems
- **Platform**: iOS/Android specific features, device capabilities, platform guidelines
- **Offline**: Offline functionality, data synchronization, conflict resolution

## Requirements Quality Standards

- **Specific and Actionable**: Each requirement should clearly define what needs to be built
- **Prioritized**: Assign high/medium/low priority based on business value and user impact
- **Categorized**: Group requirements by functional area
- **Comprehensive**: Cover all aspects needed to deliver the feature
- **Unique IDs**: Use format REQ-XXX for requirement IDs
- **No Duplication**: Ensure no requirements duplicate existing ones (for gap-based generation)

${isGapBased ? 'Focus on addressing the identified gaps while building upon existing requirements.' : 'Focus on comprehensive coverage of the feature brief.'}
    `;
  }
}
