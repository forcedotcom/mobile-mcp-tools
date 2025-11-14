/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Textual evaluation levels for gap analysis scoring.
 * These textual evaluations are more reliable for LLMs than direct numeric scoring.
 */
export const GAP_ANALYSIS_EVALUATION_LEVELS = ['Excellent', 'Good', 'Fair', 'Poor'] as const;

export type GapAnalysisEvaluationLevel = (typeof GAP_ANALYSIS_EVALUATION_LEVELS)[number];

/**
 * Mapping from textual evaluation levels to numeric scores (0-100).
 * This allows us to extract quantitative values from textual evaluations.
 */
const EVALUATION_TO_SCORE: Record<GapAnalysisEvaluationLevel, number> = {
  Excellent: 90, // 90-100: Requirements are comprehensive and well-defined
  Good: 75, // 75-89: Requirements are mostly complete with minor gaps
  Fair: 60, // 60-74: Requirements have some notable gaps but are workable
  Poor: 40, // 40-59: Requirements have significant gaps that need attention
} as const;

/**
 * Converts a textual evaluation level to a numeric score (0-100).
 *
 * @param evaluation The textual evaluation level
 * @returns Numeric score from 0-100
 */
export function evaluationToScore(evaluation: GapAnalysisEvaluationLevel): number {
  return EVALUATION_TO_SCORE[evaluation];
}

/**
 * Validates that a string is a valid gap analysis evaluation level.
 *
 * @param value The value to validate
 * @returns True if valid, false otherwise
 */
export function isValidEvaluationLevel(value: string): value is GapAnalysisEvaluationLevel {
  return GAP_ANALYSIS_EVALUATION_LEVELS.includes(value as GapAnalysisEvaluationLevel);
}
