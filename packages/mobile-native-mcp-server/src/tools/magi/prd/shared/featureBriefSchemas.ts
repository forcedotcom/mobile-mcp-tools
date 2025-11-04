/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

/**
 * Modification Request Schema
 * Used for feature brief review and update operations
 */
export const FEATURE_BRIEF_MODIFICATION_SCHEMA = z.object({
  section: z.string().describe('Section of the feature brief to modify'),
  modificationReason: z.string().describe('Reason for the modification request'),
  requestedContent: z.string().describe("The user's requested content changes"),
});

export type FeatureBriefModification = z.infer<typeof FEATURE_BRIEF_MODIFICATION_SCHEMA>;

