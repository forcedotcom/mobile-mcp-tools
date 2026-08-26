/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../../../metadata.js';
import { createComponentLogger, type Logger } from '@salesforce/magen-mcp-workflow';

/**
 * Router node that determines the next step after Android emulator listing.
 *
 * Routes to:
 * - androidStartEmulatorNodeName: if an emulator was found (androidEmulatorName is set)
 * - androidCreateEmulatorNodeName: if no emulators were found (androidEmulatorName is not set)
 */
export class CheckEmulatorFoundRouter {
  private readonly androidStartEmulatorNodeName: string;
  private readonly androidCreateEmulatorNodeName: string;
  private readonly logger: Logger;

  /**
   * Creates a new CheckEmulatorFoundRouter.
   *
   * @param androidStartEmulatorNodeName - The name of the node to route to when an emulator is found
   * @param androidCreateEmulatorNodeName - The name of the node to route to when no emulator is found
   * @param routerName - Optional name for this router instance (used in logging)
   */
  constructor(
    androidStartEmulatorNodeName: string,
    androidCreateEmulatorNodeName: string,
    routerName = 'CheckEmulatorFoundRouter'
  ) {
    this.androidStartEmulatorNodeName = androidStartEmulatorNodeName;
    this.androidCreateEmulatorNodeName = androidCreateEmulatorNodeName;
    this.logger = createComponentLogger(routerName);
  }

  execute = (state: State): string => {
    // If an emulator was found and selected, proceed to start it
    if (state.androidEmulatorName) {
      this.logger.info(`Emulator found, routing to ${this.androidStartEmulatorNodeName}`, {
        emulatorName: state.androidEmulatorName,
      });
      return this.androidStartEmulatorNodeName;
    }

    // No emulator found, route to create one
    this.logger.info(`No emulators found, routing to ${this.androidCreateEmulatorNodeName}`);
    return this.androidCreateEmulatorNodeName;
  };
}
