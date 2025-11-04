/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

/**
 * PRD Modification Request Schema
 * Used for PRD review and update operations
 */
export const PRD_MODIFICATION_SCHEMA = z.object({
  section: z.string().describe('Section of the PRD that was modified'),
  modificationReason: z.string().describe('Reason for the modification request'),
  requestedContent: z.string().describe("The user's requested content changes"),
});

export type PRDModification = z.infer<typeof PRD_MODIFICATION_SCHEMA>;

/**
 * PRD Review Result Schema
 * Used for PRD review and update operations
 */
export const PRD_REVIEW_RESULT_SCHEMA = z.object({
  approved: z.boolean().describe('Whether the PRD is approved by the user'),
  modifications: z
    .array(PRD_MODIFICATION_SCHEMA)
    .optional()
    .describe('Requested modifications to the PRD (if not approved)'),
});

export type PRDReviewResult = z.infer<typeof PRD_REVIEW_RESULT_SCHEMA>;
