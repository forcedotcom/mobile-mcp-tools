/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';

/**
 * Conditional router edge to see whether the platform setup is valid.
 */
export class CheckSetupValidatedRouter {
  private readonly setupValidatedNodeName: string;
  private readonly invalidSetupNodeName: string;

  /**
   * Creates a new CheckSetupValidatedRouter.
   *
   * @param setupValidatedNodeName - The name of the node to route to if the platform setup is valid
   * @param invalidSetupNodeName - The name of the node to route to if the platform setup is invalid
   */
  constructor(setupValidatedNodeName: string, invalidSetupNodeName: string) {
    this.setupValidatedNodeName = setupValidatedNodeName;
    this.invalidSetupNodeName = invalidSetupNodeName;
  }

  execute = (state: State): string => {
    return state.validPlatformSetup ? this.setupValidatedNodeName : this.invalidSetupNodeName;
  };
}
