/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../../src/workflow/prd/metadata.js';

/**
 * Creates a test PRDState object with sensible defaults for testing.
 *
 * LangGraph's State type doesn't allow undefined values at the type level,
 * but at runtime properties are undefined until populated by workflow nodes.
 * This helper bridges that gap for testing by allowing undefined values
 * and using a type assertion.
 *
 * @param overrides Partial state to override defaults
 * @returns A PRDState object suitable for testing
 *
 * @example
 * const state = createPRDTestState({
 *   projectPath: '/path/to/project',
 *   userUtterance: 'Add authentication feature',
 * });
 */
export function createPRDTestState(overrides: Partial<PRDState> = {}): PRDState {
  return {
    // Core PRD workflow data
    userInput: {},
    projectPath: undefined,
    featureId: undefined,
    userUtterance: undefined,

    // Feature Brief Review state
    isFeatureBriefApproved: undefined,
    featureBriefUserFeedback: undefined,
    featureBriefModifications: undefined,

    // Gap Analysis state
    gapAnalysisScore: undefined,
    identifiedGaps: undefined,

    // Iteration Control state
    shouldIterate: undefined,
    userIterationPreference: undefined,

    // PRD Review
    isPrdApproved: undefined,
    prdModifications: undefined,

    // Error Handling state
    prdWorkflowFatalErrorMessages: undefined,

    // Apply any overrides
    ...overrides,
  } as PRDState;
}
