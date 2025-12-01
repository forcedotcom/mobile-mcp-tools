/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Conditional router edge to check if Android setup extraction was successful.
 * Routes based on whether both ANDROID_HOME and JAVA_HOME were extracted from user input.
 */
export class CheckAndroidSetupExtractedRouter {
  private readonly setupExtractedNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckAndroidSetupExtractedRouter');

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
    // Check if both androidHome and javaHome were extracted
    if (state.androidHome && state.javaHome) {
      this.logger.info('Android setup successfully extracted, routing to platform check');
      return this.setupExtractedNodeName;
    }

    // If either is missing, route to failure
    const missingPaths: string[] = [];
    if (!state.androidHome) missingPaths.push('androidHome');
    if (!state.javaHome) missingPaths.push('javaHome');

    this.logger.warn(
      `Android setup extraction failed. Missing: ${missingPaths.join(', ')}. Routing to failure.`
    );
    return this.failureNodeName;
  };
}
