/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Conditional router edge to check if connected Salesforce orgs were found.
 * Routes to selection if orgs exist, otherwise routes to failure with an error message.
 */
export class CheckOrgListRouter {
  private readonly orgsFoundNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckOrgListRouter');

  /**
   * Creates a new CheckOrgListRouter.
   *
   * @param orgsFoundNodeName - The name of the node to route to if connected orgs were found (selection)
   * @param failureNodeName - The name of the node to route to if there was an error or no orgs found
   */
  constructor(orgsFoundNodeName: string, failureNodeName: string) {
    this.orgsFoundNodeName = orgsFoundNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // Check for fatal errors first
    const hasFatalErrors = Boolean(
      state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0
    );

    if (hasFatalErrors) {
      this.logger.warn(
        `Fatal errors occurred during org fetch, routing to ${this.failureNodeName}`
      );
      return this.failureNodeName;
    }

    // Check if we have connected orgs
    const hasOrgs = Boolean(state.orgList && state.orgList.length > 0);

    if (hasOrgs) {
      this.logger.info(
        `Found ${state.orgList.length} connected org(s), routing to ${this.orgsFoundNodeName}`
      );
      return this.orgsFoundNodeName;
    }

    // No connected orgs found - route to failure with error message
    this.logger.warn(`No connected orgs found, routing to ${this.failureNodeName}`);
    state.workflowFatalErrorMessages = [
      'No connected Salesforce orgs found. Please authenticate with a Salesforce org using `sf org login` and try again.',
    ];
    return this.failureNodeName;
  };
}
