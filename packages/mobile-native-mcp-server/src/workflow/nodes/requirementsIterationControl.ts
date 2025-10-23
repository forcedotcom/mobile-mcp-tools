/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode } from './abstractBaseNode.js';
import { Logger } from '../../logging/logger.js';

export class RequirementsIterationControlNode extends BaseNode {
  constructor(logger?: Logger) {
    super('requirementsIterationControl');
  }

  execute = (state: State): Partial<State> => {
    // Check if we should continue the iteration loop
    const shouldContinue = this.shouldContinueIteration(state);

    return {
      shouldContinueIteration: shouldContinue,
      iterationComplete: !shouldContinue,
    };
  };

  private shouldContinueIteration(state: State): boolean {
    // Check if user has explicitly indicated they want to continue despite gaps
    if (state.userWantsToContinueDespiteGaps) {
      return false;
    }

    // Check if there are any critical or high severity gaps
    const hasCriticalGaps =
      state.identifiedGaps?.some(gap => gap.severity === 'critical' || gap.severity === 'high') ||
      false;

    // Check if gap analysis score is below threshold (e.g., 80)
    const gapScoreThreshold = 80;
    const scoreBelowThreshold = (state.gapAnalysisScore || 0) < gapScoreThreshold;

    // Check if we've exceeded maximum iterations
    const maxIterations = 5;
    const currentIteration = state.requirementsIterationCount || 0;
    const exceededMaxIterations = currentIteration >= maxIterations;

    // Continue if there are critical/high gaps AND score is below threshold AND we haven't exceeded max iterations
    return hasCriticalGaps && scoreBelowThreshold && !exceededMaxIterations;
  }
}
