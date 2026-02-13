/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Conditional router edge to check if Connected Apps were found in the org.
 * Routes to selection if apps exist, otherwise routes to failure with an error message.
 */
export class CheckConnectedAppListRouter {
  private readonly appsFoundNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckConnectedAppListRouter');

  /**
   * Creates a new CheckConnectedAppListRouter.
   *
   * @param appsFoundNodeName - The name of the node to route to if Connected Apps were found (selection)
   * @param failureNodeName - The name of the node to route to if there was an error or no apps found
   */
  constructor(appsFoundNodeName: string, failureNodeName: string) {
    this.appsFoundNodeName = appsFoundNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // Check for fatal errors first
    const hasFatalErrors = Boolean(
      state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0
    );

    if (hasFatalErrors) {
      this.logger.warn(
        `Fatal errors occurred during Connected App fetch, routing to ${this.failureNodeName}`
      );
      return this.failureNodeName;
    }

    // Check if we have Connected Apps
    const hasConnectedApps = Boolean(state.connectedAppList && state.connectedAppList.length > 0);

    if (hasConnectedApps) {
      this.logger.info(
        `Found ${state.connectedAppList.length} Connected App(s), routing to ${this.appsFoundNodeName}`
      );
      return this.appsFoundNodeName;
    }

    // No Connected Apps found - route to failure with error message
    this.logger.warn(`No Connected Apps found in org, routing to ${this.failureNodeName}`);
    state.workflowFatalErrorMessages = [
      'No Connected Apps found in the selected Salesforce org. Please create a Connected App in your org and try again.',
    ];
    return this.failureNodeName;
  };
}
