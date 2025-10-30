/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '../../../../common/metadata.js';

/**
 * Functional Requirement Schema
 */
export const FUNCTIONAL_REQUIREMENT_SCHEMA = z.object({
  id: z.string().describe('Unique identifier for the requirement'),
  title: z.string().describe('Short title of the functional requirement'),
  description: z.string().describe('Detailed description of the functional requirement'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level of the requirement'),
  category: z
    .string()
    .describe('Category of the requirement (e.g., UI/UX, Data, Security, Performance)'),
});

/**
 * PRD Generation Tool Input Schema
 */
export const PRD_GENERATION_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  originalUserUtterance: z
    .string()
    .describe('The original user request or utterance that initiated this feature'),
  featureBrief: z.string().describe('The approved feature brief'),
  requirementsContent: z
    .string()
    .describe(
      'The content of the requirements.md file containing all requirements (approved, rejected, modified, out-of-scope)'
    ),
});

export type PRDGenerationInput = z.infer<typeof PRD_GENERATION_INPUT_SCHEMA>;

export const PRD_GENERATION_RESULT_SCHEMA = z.object({
  prdContent: z.string().describe('The complete PRD.md file content'),
  prdFilePath: z.string().describe('The file path where the PRD was generated'),
  documentStatus: z
    .object({
      author: z.string().describe('Author of the PRD'),
      lastModified: z.string().describe('Last modified date'),
      status: z.enum(['draft', 'finalized']).describe('Document status'),
    })
    .describe('Document status information'),
  requirementsCount: z.number().describe('Total number of requirements included in the PRD'),
  traceabilityTableRows: z
    .array(
      z.object({
        requirementId: z.string().describe('Requirement ID'),
        technicalRequirementIds: z.string().describe('Technical requirement IDs (TBD for now)'),
        userStoryIds: z.string().describe('User story IDs (TBD for now)'),
      })
    )
    .describe('Traceability table rows'),
});

/**
 * PRD Generation Tool Metadata
 */
export const PRD_GENERATION_TOOL: WorkflowToolMetadata<
  typeof PRD_GENERATION_INPUT_SCHEMA,
  typeof PRD_GENERATION_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-generation',
  title: 'Magi - PRD Generation',
  description:
    'Generates a comprehensive Product Requirements Document (PRD.md) from approved feature brief and requirements',
  inputSchema: PRD_GENERATION_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PRD_GENERATION_RESULT_SCHEMA,
} as const;
