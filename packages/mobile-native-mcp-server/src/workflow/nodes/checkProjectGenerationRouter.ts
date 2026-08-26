/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Conditional router edge to check if project generation was successful.
 * Routes based on whether the projectPath was set and no fatal errors occurred.
 */
export class CheckProjectGenerationRouter {
  private readonly successNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckProjectGenerationRouter');

  /**
   * Creates a new CheckProjectGenerationRouter.
   *
   * @param successNodeName - The name of the node to route to if project generation was successful (build validation)
   * @param failureNodeName - The name of the node to route to if generation failed
   */
  constructor(successNodeName: string, failureNodeName: string) {
    this.successNodeName = successNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // Check if project generation was successful by verifying projectPath exists
    // and no fatal errors occurred
    const hasProjectPath = Boolean(state.projectPath);
    const hasFatalErrors = Boolean(
      state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0
    );

    if (hasProjectPath && !hasFatalErrors) {
      this.logger.info(
        `Project generation successful at ${state.projectPath}, routing to ${this.successNodeName}`
      );
      return this.successNodeName;
    }

    // If projectPath is missing or there are fatal errors, route to failure
    const reason = hasFatalErrors
      ? `Fatal errors occurred: ${state.workflowFatalErrorMessages?.join(', ')}`
      : 'Project path not set after generation';

    this.logger.warn(
      `Project generation failed. Reason: ${reason}. Routing to ${this.failureNodeName}.`
    );
    return this.failureNodeName;
  };
}
