/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../../src/workflow/metadata.js';

/**
 * Creates a test State object with sensible defaults for testing.
 *
 * LangGraph's State type doesn't allow undefined values at the type level,
 * but at runtime properties are undefined until populated by workflow nodes.
 * This helper bridges that gap for testing by allowing undefined values
 * and using a type assertion.
 *
 * @param overrides Partial state to override defaults
 * @returns A State object suitable for testing
 *
 * @example
 * const state = createTestState({
 *   userInput: 'Create an iOS app',
 *   platform: 'iOS',
 * });
 */
export function createTestState(overrides: Partial<State> = {}): State {
  return {
    // Core workflow data
    userInput: '',
    platform: undefined,

    // Plan phase state
    validEnvironment: undefined,
    validPlatformSetup: undefined,
    validPluginSetup: undefined,
    workflowFatalErrorMessages: undefined,

    // Android setup state
    androidInstalled: undefined,
    androidHome: undefined,
    javaHome: undefined,

    selectedTemplate: undefined,
    projectName: undefined,
    projectPath: undefined,
    packageName: undefined,
    organization: undefined,
    connectedAppClientId: undefined,
    connectedAppCallbackUri: undefined,
    loginHost: undefined,

    // Build and deployment state
    buildType: undefined,
    targetDevice: undefined,
    buildSuccessful: undefined,
    buildAttemptCount: undefined,
    buildErrorMessages: undefined,
    maxBuildRetries: undefined,
    buildOutputFilePath: undefined,
    recoveryReadyForRetry: undefined,
    deploymentStatus: undefined,

    // Apply any overrides
    ...overrides,
  } as State;
}
