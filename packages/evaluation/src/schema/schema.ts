/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod/v4';

export const ScoreVerdictEnum = z.enum([
  'Pass GA Criteria',
  'Pass Beta Criteria',
  'Pass Dev Preview Criteria',
  'FAIL',
]);

export const ScoreSchema = z.object({
  verdict: ScoreVerdictEnum,
  rawScore: z.number().min(0).max(100),
});

export const ScoreCategorySchema = z.enum([
  'Excellent', // Perfect or near-perfect match
  'Good', // Strong understanding with minor differences
  'Satisfactory', // Adequate understanding with some notable differences
  'Limited', // Basic understanding with significant gaps
  'Poor', // Major misunderstandings or omissions
  'Missing', // Issue completely overlooked or fatally misunderstood
]);

export const CorrectnessScoreSchema = ScoreSchema.extend({
  scoreCategory: ScoreCategorySchema,
  failedIssues: z.array(z.string()).describe('List of issues that were not properly addressed'),
  incorrectOrUnauthorizedChanges: z
    .array(z.string())
    .describe('List of issues that represent incorrect or unauthorized changes'),
});

export type Score = z.infer<typeof ScoreSchema>;
export type ScoreVerdict = z.infer<typeof ScoreVerdictEnum>;
export type ScoreCategory = z.infer<typeof ScoreCategorySchema>;
export type CorrectnessScore = z.infer<typeof CorrectnessScoreSchema>;
