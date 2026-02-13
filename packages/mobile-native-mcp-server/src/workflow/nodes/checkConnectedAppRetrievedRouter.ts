/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Conditional router edge to check if Connected App credentials were successfully retrieved.
 * Routes based on whether the connectedAppClientId and connectedAppCallbackUri were set
 * and no fatal errors occurred.
 */
export class CheckConnectedAppRetrievedRouter {
  private readonly successNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckConnectedAppRetrievedRouter');

  /**
   * Creates a new CheckConnectedAppRetrievedRouter.
   *
   * @param successNodeName - The name of the node to route to if retrieval was successful (project generation)
   * @param failureNodeName - The name of the node to route to if retrieval failed
   */
  constructor(successNodeName: string, failureNodeName: string) {
    this.successNodeName = successNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // Check if connected app credentials were successfully retrieved
    const hasClientId = Boolean(state.connectedAppClientId);
    const hasCallbackUri = Boolean(state.connectedAppCallbackUri);
    const hasFatalErrors = Boolean(
      state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0
    );

    if (hasClientId && hasCallbackUri && !hasFatalErrors) {
      this.logger.info(
        `Connected App credentials retrieved successfully, routing to ${this.successNodeName}`
      );
      return this.successNodeName;
    }

    // If credentials are missing or there are fatal errors, route to failure
    const reasons: string[] = [];
    if (!hasClientId) {
      reasons.push('Missing connectedAppClientId');
    }
    if (!hasCallbackUri) {
      reasons.push('Missing connectedAppCallbackUri');
    }
    if (hasFatalErrors) {
      reasons.push(`Fatal errors: ${state.workflowFatalErrorMessages?.join(', ')}`);
    }

    this.logger.warn(
      `Connected App retrieval failed. Reasons: ${reasons.join('; ')}. Routing to ${this.failureNodeName}.`
    );
    return this.failureNodeName;
  };
}
