/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../../logging/logger.js';
import {
  GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL,
  GapBasedFunctionalRequirementsInput,
} from './metadata.js';
import { PRDAbstractWorkflowTool } from '../../../base/prdAbstractWorkflowTool.js';
import { RequirementsBaseUtility } from '../shared/requirementsBaseUtility.js';

export class SFMobileNativeGapBasedFunctionalRequirementsTool extends PRDAbstractWorkflowTool<
  typeof GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL
> {
  private requirementsUtility: RequirementsBaseUtility;

  constructor(server: McpServer, logger?: Logger) {
    super(
      server,
      GAP_BASED_FUNCTIONAL_REQUIREMENTS_TOOL,
      'GapBasedFunctionalRequirementsTool',
      logger
    );
    this.requirementsUtility = new RequirementsBaseUtility();
  }

  public handleRequest = async (input: GapBasedFunctionalRequirementsInput) => {
    const guidance = this.generateGapBasedFunctionalRequirementsGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateGapBasedFunctionalRequirementsGuidance(
    input: GapBasedFunctionalRequirementsInput
  ) {
    // This tool is specifically for gap-based generation
    // Initial requirements generation is handled by magi-prd-initial-requirements
    if (!input.identifiedGaps || input.identifiedGaps.length === 0) {
      throw new Error(
        'Gap-based functional requirements tool requires identified gaps. Use magi-prd-initial-requirements for initial requirements generation.'
      );
    }

    const gapsList = input.identifiedGaps
      .map(
        (gap, index) => `${index + 1}. **${gap.title}** (${gap.severity} severity)
 - ID: ${gap.id}
 - Category: ${gap.category}
 - Description: ${gap.description}
 - Impact: ${gap.impact}
 - Suggested Requirements: ${gap.suggestedRequirements.map(req => req.title).join(', ')}`
      )
      .join('\n\n');

    const requirementsSection = input.requirementsContent
      ? `## Current Functional Requirements

${input.requirementsContent}

**Important**: When analyzing existing requirements, focus on **approved requirements** and **modified requirements**. Ignore **rejected requirements** and **out-of-scope requirements** as they have been explicitly excluded from the feature scope.
`
      : '';

    return `
You are a product requirements analyst tasked with generating functional requirements based on identified gaps.

## Feature Brief

${input.featureBrief}

${requirementsSection}## Gap Analysis Context

The following gaps have been identified in the current requirements that need to be addressed:

${gapsList}

## Your Task

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

${this.requirementsUtility.generateCommonRequirementsGuidance()}

Focus on addressing the identified gaps while building upon existing requirements.
    `;
  }
}
