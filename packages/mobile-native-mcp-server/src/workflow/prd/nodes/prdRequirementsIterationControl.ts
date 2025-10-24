/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../metadata.js';
import { PRDBaseNode } from './prdBaseNode.js';
import { Logger } from '../../../logging/logger.js';

export class PRDRequirementsIterationControlNode extends PRDBaseNode {
  constructor() {
    super('requirementsIterationControl');
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Determine if we should continue iteration based on gap analysis score
    const gapAnalysisScore = state.gapAnalysisScore || 0;
    const shouldContinueIteration = gapAnalysisScore < 0.8; // Continue if score is below 80%

    return {
      shouldContinueIteration: shouldContinueIteration,
    };
  };
}
