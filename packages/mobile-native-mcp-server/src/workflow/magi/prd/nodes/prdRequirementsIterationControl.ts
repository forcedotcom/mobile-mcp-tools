/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../metadata.js';
import { PRDBaseNode } from './prdBaseNode.js';
import { Logger } from '../../../../logging/logger.js';

export class PRDRequirementsIterationControlNode extends PRDBaseNode {
  constructor(private readonly logger?: Logger) {
    super('requirementsIterationControl');
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get gap analysis score and normalize to 0..1 if needed
    const scoreRaw = state.gapAnalysisScore ?? 0;
    const normalizedScore = scoreRaw > 1 ? scoreRaw / 100 : scoreRaw;

    // Check if user has explicitly overridden the decision
    const userOverride = state.userIterationOverride;

    // Determine if we should continue iteration
    let shouldIterate: boolean;

    if (userOverride === true) {
      shouldIterate = true;
    } else if (userOverride === false) {
      shouldIterate = false;
    } else {
      // No explicit user decision - use gap score threshold (0.8 = 80%)
      shouldIterate = normalizedScore < 0.8;
    }

    this.logger?.info('Iteration decision:', {
      gapAnalysisScore: scoreRaw,
      normalizedScore,
      userIterationOverride: userOverride,
      shouldIterate,
    });

    return {
      shouldIterate,
    };
  };
}
