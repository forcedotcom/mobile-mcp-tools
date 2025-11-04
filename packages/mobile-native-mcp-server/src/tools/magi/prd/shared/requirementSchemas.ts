/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

/**
 * Requirement Modification Request Schema
 * Used for requirements review and update operations
 */
export const REQUIREMENT_MODIFICATION_SCHEMA = z.object({
  requirementId: z.string().describe('The ID of the requirement to modify (e.g., REQ-001)'),
  modificationReason: z.string().describe('Reason for the modification request'),
  requestedChanges: z
    .object({
      title: z.string().optional().describe('New title for the requirement'),
      description: z.string().optional().describe('New description for the requirement'),
      priority: z.enum(['high', 'medium', 'low']).optional().describe('New priority level'),
      category: z.string().optional().describe('New category'),
    })
    .describe('Specific changes requested for this requirement'),
});

export type RequirementModification = z.infer<typeof REQUIREMENT_MODIFICATION_SCHEMA>;

/**
 * Requirements Review Result Schema
 * Used for requirements review and update operations
 */
export const REQUIREMENTS_REVIEW_RESULT_SCHEMA = z.object({
  approvedRequirementIds: z
    .array(z.string())
    .describe('Array of requirement IDs that were approved in this review session'),
  rejectedRequirementIds: z
    .array(z.string())
    .describe('Array of requirement IDs that were rejected in this review session'),
  modifications: z
    .array(REQUIREMENT_MODIFICATION_SCHEMA)
    .optional()
    .describe('Array of modification requests for requirements'),
  userFeedback: z.string().optional().describe('Additional feedback or comments from the user'),
  reviewSummary: z.string().describe('Summary of the review process and decisions made'),
  userIterationPreference: z
    .boolean()
    .optional()
    .describe(
      'Optional user decision to finalize requirements. If true, user wants to finalize and proceed to PRD generation despite any gaps or pending items. If false or not provided, continue with normal workflow (gap analysis or applying modifications).'
    ),
});

export type RequirementsReviewResult = z.infer<typeof REQUIREMENTS_REVIEW_RESULT_SCHEMA>;

