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
    const requirementsList = input.functionalRequirements
      .map(
        (req, index) => `${index + 1}. **${req.title}** (${req.priority} priority)
   - ID: ${req.id}
   - Category: ${req.category}
   - Description: ${req.description}`
      )
      .join('\n\n');

    return `
You are a requirements analysis expert conducting a comprehensive gap analysis for a Salesforce mobile native app. Your task is to analyze the current functional requirements against the original feature brief to identify gaps, assess requirement strengths, and provide actionable recommendations.

## Feature Brief

${input.featureBrief}

## Current Functional Requirements

${requirementsList}

## Gap Analysis Process

Conduct a thorough analysis by examining:

1. **Coverage Analysis**: Does each aspect of the feature brief have corresponding requirements?
2. **Completeness Analysis**: Are all necessary components, flows, and edge cases covered?
3. **Clarity Analysis**: Are requirements specific, measurable, and actionable?
4. **Feasibility Analysis**: Are requirements realistic and implementable for a mobile native app?
5. **Integration Analysis**: Are Salesforce-specific capabilities properly addressed?
6. **User Experience Analysis**: Are user flows and interactions properly defined?

## Output Format

You must return a JSON object with the following structure:

\`\`\`json
{
  "gapAnalysisScore": 75,
  "identifiedGaps": [
    {
      "id": "GAP-001",
      "title": "Missing Offline Data Synchronization",
      "description": "The feature brief mentions offline capabilities, but no requirements address data synchronization when the app comes back online",
      "severity": "high",
      "category": "Data",
      "impact": "Users may lose data or experience inconsistent states when switching between online/offline modes",
      "suggestedRequirements": [
        {
          "title": "Offline Data Sync Strategy",
          "description": "Implement conflict resolution and data synchronization when the app reconnects to the network",
          "priority": "high",
          "category": "Data"
        }
      ]
    }
  ],
  "requirementStrengths": [
    {
      "requirementId": "REQ-001",
      "strengthScore": 8,
      "strengths": ["Clear and specific", "Properly prioritized", "Includes security considerations"],
      "weaknesses": ["Missing error handling details", "No performance criteria specified"]
    }
  ],
  "overallAssessment": {
    "coverageScore": 80,
    "completenessScore": 70,
    "clarityScore": 85,
    "feasibilityScore": 90
  },
  "recommendations": [
    "Add more specific error handling requirements",
    "Include performance benchmarks for data operations",
    "Define offline-first data strategy"
  ],
  "summary": "The requirements provide good coverage of core functionality but lack detail in offline capabilities and error handling scenarios."
}
\`\`\`

## Analysis Guidelines

### Gap Identification
- Look for missing functionality mentioned in the feature brief
- Identify incomplete user flows or edge cases
- Check for missing technical requirements (security, performance, etc.)
- Look for gaps in Salesforce-specific capabilities
- Consider mobile-specific requirements (offline, notifications, device features)

### Severity Assessment
- **Critical**: Fundamental functionality missing that would prevent feature from working
- **High**: Important functionality missing that would significantly impact user experience
- **Medium**: Nice-to-have functionality missing that would improve user experience
- **Low**: Minor enhancements or optimizations missing

### Requirement Strength Scoring (0-10)
- **9-10**: Excellent - Clear, complete, actionable, well-prioritized
- **7-8**: Good - Mostly clear with minor gaps or ambiguities
- **5-6**: Fair - Adequate but needs improvement in clarity or completeness
- **3-4**: Poor - Significant gaps or ambiguities
- **0-2**: Very Poor - Unclear, incomplete, or not actionable

### Assessment Categories
- **Coverage Score**: How well requirements cover the feature brief (0-100)
- **Completeness Score**: How complete and thorough the requirements are (0-100)
- **Clarity Score**: How clear, specific, and actionable the requirements are (0-100)
- **Feasibility Score**: How realistic and implementable the requirements are (0-100)

## Key Areas to Analyze

1. **User Experience**: Login flows, navigation, user interactions, accessibility
2. **Data Management**: Data models, API integration, persistence, synchronization
3. **Security**: Authentication, authorization, data protection, compliance
4. **Performance**: Loading times, memory usage, battery optimization, scalability
5. **Platform Integration**: Salesforce APIs, device capabilities, platform guidelines
6. **Offline Capabilities**: Offline functionality, data sync, conflict resolution
7. **Error Handling**: Error scenarios, recovery mechanisms, user feedback
8. **Testing**: Test scenarios, validation criteria, acceptance criteria

Conduct a comprehensive analysis and provide detailed, actionable feedback that will help improve the requirements quality and completeness.
    `;
  }
}
