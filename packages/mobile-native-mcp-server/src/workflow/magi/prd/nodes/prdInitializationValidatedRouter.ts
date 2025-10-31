/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../metadata.js';

/**
 * Conditional router that determines if PRD initialization was successful.
 *
 * Routes to:
 * - initializationValidatedNodeName: if initialization was successful
 * - failureNodeName: if initialization failed (error messages present)
 */
export class PRDInitializationValidatedRouter {
  private readonly initializationValidatedNodeName: string;
  private readonly failureNodeName: string;

  /**
   * Creates a new PRDInitializationValidatedRouter.
   *
   * @param initializationValidatedNodeName - The name of the node to route to if initialization was successful
   * @param failureNodeName - The name of the node to route to if initialization failed
   */
  constructor(initializationValidatedNodeName: string, failureNodeName: string) {
    this.initializationValidatedNodeName = initializationValidatedNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: PRDState): string => {
    // If there are fatal error messages, route to failure
    const hasErrors =
      state.prdWorkflowFatalErrorMessages && state.prdWorkflowFatalErrorMessages.length > 0;

    return hasErrors ? this.failureNodeName : this.initializationValidatedNodeName;
  };
}
