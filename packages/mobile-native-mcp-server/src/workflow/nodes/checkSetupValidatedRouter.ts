/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createComponentLogger } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

/**
 * Conditional router edge to see whether the platform setup is valid.
 * For Android platform, if Android/Java setup is missing, routes to the Android setup node.
 */
export class CheckSetupValidatedRouter {
  private readonly setupValidatedNodeName: string;
  private readonly androidSetupNodeName: string;
  private readonly invalidSetupNodeName: string;
  private readonly logger = createComponentLogger('CheckSetupValidatedRouter');

  /**
   * Creates a new CheckSetupValidatedRouter.
   *
   * @param setupValidatedNodeName - The name of the node to route to if the platform setup is valid
   * @param androidSetupNodeName - The name of the node to route to for Android setup recovery
   * @param invalidSetupNodeName - The name of the node to route to if the platform setup is invalid
   */
  constructor(
    setupValidatedNodeName: string,
    androidSetupNodeName: string,
    invalidSetupNodeName: string
  ) {
    this.setupValidatedNodeName = setupValidatedNodeName;
    this.androidSetupNodeName = androidSetupNodeName;
    this.invalidSetupNodeName = invalidSetupNodeName;
  }

  execute = (state: State): string => {
    // If platform setup is valid, proceed
    if (state.validPlatformSetup) {
      this.logger.info(`Platform setup valid, routing to ${this.setupValidatedNodeName}`);
      return this.setupValidatedNodeName;
    }

    // If platform is Android and Android/Java paths are missing, route to Android setup
    if (state.platform === 'Android' && (!state.androidHome || !state.javaHome)) {
      const missingSetup: string[] = [];
      if (!state.androidHome) missingSetup.push('androidHome');
      if (!state.javaHome) missingSetup.push('javaHome');
      this.logger.info(
        `Android setup missing ${missingSetup.join(', ')}, routing to ${this.androidSetupNodeName}`
      );
      return this.androidSetupNodeName;
    }

    // Otherwise, route to failure
    this.logger.info(`Platform setup invalid, routing to ${this.invalidSetupNodeName}`);
    return this.invalidSetupNodeName;
  };
}
