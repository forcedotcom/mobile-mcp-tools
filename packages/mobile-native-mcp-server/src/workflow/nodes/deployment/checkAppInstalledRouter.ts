/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Router node that determines the next step after Android app installation.
 *
 * Routes to:
 * - androidLaunchAppNodeName: if app installed successfully (no fatal errors)
 * - failureNodeName: if app installation failed (workflowFatalErrorMessages has errors)
 */
export class CheckAppInstalledRouter {
  private readonly androidLaunchAppNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckAppInstalledRouter');

  constructor(androidLaunchAppNodeName: string, failureNodeName: string) {
    this.androidLaunchAppNodeName = androidLaunchAppNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // If there are fatal error messages, route to failure
    if (state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0) {
      this.logger.error(
        `App installation failed, routing to ${this.failureNodeName}: ${state.workflowFatalErrorMessages.join(', ')}`
      );
      return this.failureNodeName;
    }

    // App installed successfully, proceed to launch
    this.logger.info(`App installed, routing to ${this.androidLaunchAppNodeName}`);
    return this.androidLaunchAppNodeName;
  };
}
