/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type { Command, ProgressParseResult } from '@salesforce/magen-mcp-workflow';

/**
 * Progress weight constants for pattern matching
 */
export const PROGRESS_COMPLETE = 100;
export const PROGRESS_FAILURE = -1;
export const PROGRESS_MAX_BEFORE_COMPLETE = 95;

/**
 * Parameters for creating a build command
 */
export interface BuildCommandParams {
  projectPath: string;
  projectName: string;
  buildOutputDir: string;
}

/**
 * Factory interface for creating platform-specific build commands
 * and parsing build output for progress.
 */
export interface BuildCommandFactory {
  /**
   * Creates a build command for the platform.
   *
   * @param params - Build command parameters
   * @returns Command structure ready for execution
   */
  create(params: BuildCommandParams): Command;

  /**
   * Parses build output to extract progress information.
   *
   * @param output - Accumulated build output
   * @param currentProgress - Current progress value (0-100)
   * @returns Progress parse result with updated progress
   */
  parseProgress(output: string, currentProgress: number): ProgressParseResult;
}

/**
 * Pattern definition for progress parsing
 */
export interface ProgressPattern {
  /** Regex pattern to match in build output */
  pattern: RegExp;
  /**
   * Weight for progress calculation:
   * - Positive values increment progress by weight * matches
   * - PROGRESS_COMPLETE (100) indicates build completion
   * - PROGRESS_FAILURE (-1) indicates build failure (no progress update)
   */
  weight: number;
}

/**
 * Parses build output for progress using pattern matching.
 * This utility function is used by platform-specific factories to avoid duplication.
 *
 * @param output - Accumulated build output
 * @param currentProgress - Current progress value (0-100)
 * @param patterns - Array of progress patterns to match
 * @param formatMessage - Function to format the progress message from a match
 * @returns Progress parse result with updated progress
 */
export function parseProgressWithPatterns(
  output: string,
  currentProgress: number,
  patterns: ProgressPattern[],
  formatMessage: (lastMatch: RegExpMatchArray) => string
): ProgressParseResult {
  let newProgress = currentProgress;
  let message: string | undefined;

  for (const { pattern, weight } of patterns) {
    const matches = Array.from(output.matchAll(pattern));
    if (matches.length > 0) {
      if (weight === PROGRESS_COMPLETE) {
        newProgress = PROGRESS_COMPLETE;
        message = 'Build completed successfully';
        break;
      } else if (weight === PROGRESS_FAILURE) {
        // Build failed, but don't update progress
        message = 'Build failed';
        break;
      } else {
        // Increment progress based on number of matches
        const increment = Math.min(weight * matches.length, PROGRESS_COMPLETE - currentProgress);
        newProgress = Math.min(currentProgress + increment, PROGRESS_MAX_BEFORE_COMPLETE);
        const lastMatch = matches[matches.length - 1];
        message = formatMessage(lastMatch);
      }
    }
  }

  return {
    progress: Math.max(newProgress, currentProgress), // Never decrease progress
    message,
  };
}
