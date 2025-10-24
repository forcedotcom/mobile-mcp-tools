/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { PROJECT_PATH_FIELD } from '../../../../common/schemas.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowToolMetadata,
} from '../../../../common/metadata.js';

/**
 * PRD Review Tool Input Schema
 */
export const PRD_REVIEW_INPUT_SCHEMA = WORKFLOW_TOOL_BASE_INPUT_SCHEMA.extend({
  projectPath: PROJECT_PATH_FIELD,
  prdContent: z.string().describe('The complete PRD.md file content to review'),
  prdFilePath: z.string().describe('The file path where the PRD is located'),
  documentStatus: z
    .object({
      author: z.string().describe('Author of the PRD'),
      lastModified: z.string().describe('Last modified date'),
      status: z.enum(['draft', 'finalized']).describe('Document status'),
    })
    .describe('Current document status'),
});

export type PRDReviewInput = z.infer<typeof PRD_REVIEW_INPUT_SCHEMA>;

export const PRD_REVIEW_RESULT_SCHEMA = z.object({
  prdApproved: z.boolean().describe('Whether the user approved the PRD'),
  prdModifications: z
    .array(
      z.object({
        section: z.string().describe('Section of the PRD that was modified'),
        originalContent: z.string().describe('Original content that was changed'),
        modifiedContent: z.string().describe('New content after modification'),
        modificationReason: z.string().describe('Reason for the modification'),
      })
    )
    .optional()
    .describe('Any modifications requested by the user'),
  userFeedback: z.string().optional().describe('Additional feedback or comments from the user'),
  reviewSummary: z.string().describe('Summary of the review process and decisions made'),
});

/**
 * PRD Review Tool Metadata
 */
export const PRD_REVIEW_TOOL: WorkflowToolMetadata<
  typeof PRD_REVIEW_INPUT_SCHEMA,
  typeof PRD_REVIEW_RESULT_SCHEMA
> = {
  toolId: 'magi-prd-review',
  title: 'Magi - PRD Review',
  description: 'Presents the generated PRD to the user for review, approval, or modification',
  inputSchema: PRD_REVIEW_INPUT_SCHEMA,
  outputSchema: MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  resultSchema: PRD_REVIEW_RESULT_SCHEMA,
} as const;
