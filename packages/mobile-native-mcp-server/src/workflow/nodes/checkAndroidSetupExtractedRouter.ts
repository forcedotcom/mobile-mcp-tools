/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';

/**
 * Conditional router edge to check if Android setup extraction was successful.
 * Routes based on whether both ANDROID_HOME and JAVA_HOME were extracted from user input.
 */
export class CheckAndroidSetupExtractedRouter {
  private readonly setupExtractedNodeName: string;
  private readonly failureNodeName: string;

  /**
   * Creates a new CheckAndroidSetupExtractedRouter.
   *
   * @param setupExtractedNodeName - The name of the node to route to if Android setup was successfully extracted (retry platform check)
   * @param failureNodeName - The name of the node to route to if extraction failed
   */
  constructor(setupExtractedNodeName: string, failureNodeName: string) {
    this.setupExtractedNodeName = setupExtractedNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // Check if both android_home and java_home were extracted
    if (state.android_home && state.java_home) {
      return this.setupExtractedNodeName;
    }

    // If either is missing, route to failure
    return this.failureNodeName;
  };
}
