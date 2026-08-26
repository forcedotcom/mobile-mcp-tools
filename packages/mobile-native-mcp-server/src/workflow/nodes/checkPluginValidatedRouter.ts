/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createComponentLogger } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

/**
 * Conditional router edge to see whether the plugin setup is valid.
 */
export class CheckPluginValidatedRouter {
  private readonly pluginValidatedNodeName: string;
  private readonly invalidPluginNodeName: string;
  private readonly logger = createComponentLogger('CheckPluginValidatedRouter');

  /**
   * Creates a new CheckPluginValidatedRouter.
   *
   * @param pluginValidatedNodeName - The name of the node to route to if the plugin setup is valid
   * @param invalidPluginNodeName - The name of the node to route to if the plugin setup is invalid
   */
  constructor(pluginValidatedNodeName: string, invalidPluginNodeName: string) {
    this.pluginValidatedNodeName = pluginValidatedNodeName;
    this.invalidPluginNodeName = invalidPluginNodeName;
  }

  execute = (state: State): string => {
    if (state.validPluginSetup === true) {
      this.logger.info(`Plugin setup valid, routing to ${this.pluginValidatedNodeName}`);
      return this.pluginValidatedNodeName;
    }

    this.logger.info(`Plugin setup invalid, routing to ${this.invalidPluginNodeName}`);
    return this.invalidPluginNodeName;
  };
}
