/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../../metadata.js';
import { createComponentLogger } from '@salesforce/magen-mcp-workflow';

/**
 * Router node that determines the next step after Android emulator creation.
 *
 * Routes to:
 * - androidStartEmulatorNodeName: if emulator was created successfully (androidEmulatorName is set)
 * - failureNodeName: if emulator creation failed (workflowFatalErrorMessages has errors)
 */
export class CheckEmulatorCreatedRouter {
  private readonly androidStartEmulatorNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckEmulatorCreatedRouter');

  constructor(androidStartEmulatorNodeName: string, failureNodeName: string) {
    this.androidStartEmulatorNodeName = androidStartEmulatorNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    // If emulator was created successfully, proceed to start it
    if (state.androidEmulatorName) {
      this.logger.info(`Emulator created, routing to ${this.androidStartEmulatorNodeName}`, {
        emulatorName: state.androidEmulatorName,
      });
      return this.androidStartEmulatorNodeName;
    }

    // If there are fatal error messages, route to failure
    if (state.workflowFatalErrorMessages && state.workflowFatalErrorMessages.length > 0) {
      this.logger.error(
        `Emulator creation failed, routing to ${this.failureNodeName}: ${state.workflowFatalErrorMessages.join(', ')}`
      );
      return this.failureNodeName;
    }

    // Default to failure if state is unclear
    this.logger.warn(
      `Unexpected state: no emulator name and no error messages, routing to ${this.failureNodeName}`
    );
    return this.failureNodeName;
  };
}
