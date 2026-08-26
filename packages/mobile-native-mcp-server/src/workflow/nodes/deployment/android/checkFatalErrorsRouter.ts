/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../../../metadata.js';
import { createComponentLogger, type Logger } from '@salesforce/magen-mcp-workflow';

/**
 * Generic router that checks for fatal workflow errors and routes accordingly.
 *
 * This router is used after nodes that may set workflowFatalErrorMessages to indicate failure.
 * It provides a simple success/failure routing pattern based on error state.
 *
 * Routes to:
 * - successNodeName: if no fatal errors (workflowFatalErrorMessages is empty or undefined)
 * - failureNodeName: if fatal errors exist (workflowFatalErrorMessages has entries)
 */
export class CheckFatalErrorsRouter {
  private readonly successNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger: Logger;

  /**
   * Creates a new CheckFatalErrorsRouter.
   *
   * @param successNodeName - The name of the node to route to on success
   * @param failureNodeName - The name of the node to route to on failure
   * @param routerName - Optional name for this router instance (used in logging)
   */
  constructor(
    successNodeName: string,
    failureNodeName: string,
    routerName = 'CheckFatalErrorsRouter'
  ) {
    this.successNodeName = successNodeName;
    this.failureNodeName = failureNodeName;
    this.logger = createComponentLogger(routerName);
  }

  execute = (state: State): string => {
    // If there are fatal error messages, route to failure
    if (state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0) {
      this.logger.warn(`Fatal errors detected, routing to ${this.failureNodeName}`, {
        errorMessages: state.workflowFatalErrorMessages,
      });
      return this.failureNodeName;
    }

    // No fatal errors, proceed to success node
    this.logger.info(`No fatal errors, routing to ${this.successNodeName}`);
    return this.successNodeName;
  };
}
