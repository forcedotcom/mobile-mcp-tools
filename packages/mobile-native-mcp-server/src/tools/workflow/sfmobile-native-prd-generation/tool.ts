/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../logging/logger.js';
import { PRD_GENERATION_TOOL, PRDGenerationInput } from './metadata.js';
import { AbstractWorkflowTool } from '../../base/abstractWorkflowTool.js';

export class SFMobileNativePRDGenerationTool extends AbstractWorkflowTool<
  typeof PRD_GENERATION_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, PRD_GENERATION_TOOL, 'PRDGenerationTool', logger);
  }

  public handleRequest = async (input: PRDGenerationInput) => {
    const guidance = this.generatePRDGenerationGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generatePRDGenerationGuidance(input: PRDGenerationInput) {
    const requirementsList = input.approvedRequirements
      .map(
        (req, index) => `${index + 1}. **${req.title}** (${req.priority} priority)
   - ID: ${req.id}
   - Category: ${req.category}
   - Description: ${req.description}`
      )
      .join('\n\n');

    const modifiedRequirementsList =
      input.modifiedRequirements
        ?.map(
          (req, index) => `${index + 1}. **${req.title}** (${req.priority} priority) - MODIFIED
   - ID: ${req.id}
   - Original ID: ${req.originalId}
   - Category: ${req.category}
   - Description: ${req.description}
   - Modification Notes: ${req.modificationNotes}`
        )
        .join('\n\n') || 'None';

    const traceabilityRows = [
      ...input.approvedRequirements.map(req => ({
        requirementId: req.id,
        technicalRequirementIds: 'TBD (populated later)',
        userStoryIds: 'TBD (populated later)',
      })),
      ...(input.modifiedRequirements || []).map(req => ({
        requirementId: req.id,
        technicalRequirementIds: 'TBD (populated later)',
        userStoryIds: 'TBD (populated later)',
      })),
    ];

    return `
You are a technical writer tasked with creating a comprehensive Product Requirements Document (PRD) for a Salesforce mobile native app feature.

## Input Context

### Original User Utterance
${input.originalUserUtterance}

### Feature Brief
${input.featureBrief}

### Approved Functional Requirements
${requirementsList}

### Modified Requirements
${modifiedRequirementsList}

## Your Task

Generate a complete PRD.md file with the following structure and content:

## Required PRD Structure

### 1. Document Status
- **Author**: "AI Assistant (Mobile MCP Tools)"
- **Last Modified**: Current date in YYYY-MM-DD format
- **Status**: "draft" (since this is the initial generation)

### 2. Original User Utterance
Include the exact original user request that initiated this feature.

### 3. Feature Brief
Include the approved feature brief as generated during the requirements process.

### 4. Functional Requirements
List all approved requirements with:
- Requirement ID
- Title
- Priority (High/Medium/Low)
- Category
- Detailed description

Also include any modified requirements with modification notes.

### 5. Traceability
Create a traceability table with the following structure:

| Requirement ID | Technical Requirement IDs | User Story IDs |
| --------- | -------------- | --------- |
${traceabilityRows.map(row => `| ${row.requirementId} | ${row.technicalRequirementIds} | ${row.userStoryIds} |`).join('\n')}

## Output Format

You must return a JSON object with the following structure:

\`\`\`json
{
  "prdContent": "# Product Requirements Document\\n\\n## Document Status\\n...",
  "prdFilePath": "${input.projectPath}/PRD.md",
  "documentStatus": {
    "author": "AI Assistant (Mobile MCP Tools)",
    "lastModified": "2025-01-27",
    "status": "draft"
  },
  "requirementsCount": ${input.approvedRequirements.length + (input.modifiedRequirements?.length || 0)},
  "traceabilityTableRows": [
    {
      "requirementId": "REQ-001",
      "technicalRequirementIds": "TBD (populated later)",
      "userStoryIds": "TBD (populated later)"
    }
  ]
}
\`\`\`

## PRD Content Guidelines

### Document Formatting
- Use proper Markdown formatting
- Include clear section headers with ##
- Use bullet points and numbered lists appropriately
- Ensure proper table formatting for traceability

### Content Quality
- Write in clear, professional technical language
- Ensure all requirements are properly documented
- Include context about the feature's purpose and scope
- Maintain consistency in formatting and terminology

### Traceability Table
- Include ALL requirements (approved + modified)
- Use "TBD (populated later)" for Technical Requirement IDs and User Story IDs
- Ensure Requirement IDs match exactly with the input requirements

### File Path
- Generate the PRD.md file in the project directory
- Use the projectPath from the input

Generate a comprehensive, well-structured PRD that serves as the definitive source of truth for this feature's requirements.
    `;
  }
}
