/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';

/**
 * Schema for a suggested requirement in a gap
 */
export const SUGGESTED_REQUIREMENT_SCHEMA = z.object({
  title: z.string().describe('Suggested requirement title'),
  description: z.string().describe('Suggested requirement description'),
  priority: z.enum(['high', 'medium', 'low']).describe('Suggested priority'),
  category: z.string().describe('Suggested category'),
});

export type SuggestedRequirement = z.infer<typeof SUGGESTED_REQUIREMENT_SCHEMA>;

/**
 * Schema for a gap identified in requirements
 */
export const GAP_SCHEMA = z.object({
  id: z.string().describe('Unique identifier for the gap'),
  title: z.string().describe('Title of the identified gap'),
  description: z.string().describe('Detailed description of the gap'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Severity of the gap'),
  category: z.string().describe('Category of the gap'),
  impact: z.string().describe('Description of the impact if this gap is not addressed'),
  suggestedRequirements: z
    .array(SUGGESTED_REQUIREMENT_SCHEMA)
    .describe('Suggested requirements to address this gap'),
});

export type Gap = z.infer<typeof GAP_SCHEMA>;
