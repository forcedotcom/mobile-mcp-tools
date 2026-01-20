/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Router node that determines the next step after Android emulator start.
 *
 * Routes to:
 * - androidInstallAppNodeName: if emulator started successfully (no fatal errors)
 * - failureNodeName: if emulator start failed (workflowFatalErrorMessages has errors)
 */
export class CheckEmulatorStartedRouter {
  private readonly androidInstallAppNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckEmulatorStartedRouter');

  constructor(androidInstallAppNodeName: string, failureNodeName: string) {
    this.androidInstallAppNodeName = androidInstallAppNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // If there are fatal error messages, route to failure
    if (state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0) {
      this.logger.error(
        `Emulator start failed, routing to ${this.failureNodeName}: ${state.workflowFatalErrorMessages.join(', ')}`
      );
      return this.failureNodeName;
    }

    // Emulator started successfully, proceed to install app
    this.logger.info(`Emulator started, routing to ${this.androidInstallAppNodeName}`);
    return this.androidInstallAppNodeName;
  };
}
