/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createComponentLogger } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

/**
 * Conditional router that routes based on whether the iOS simulator is running.
 * Routes to boot simulator if not running, or to install app if already running.
 */
export class CheckSimulatorRunningRouter {
  private readonly bootSimulatorNodeName: string;
  private readonly installAppNodeName: string;
  private readonly logger = createComponentLogger('CheckSimulatorRunningRouter');

  constructor(bootSimulatorNodeName: string, installAppNodeName: string) {
    this.bootSimulatorNodeName = bootSimulatorNodeName;
    this.installAppNodeName = installAppNodeName;
  }

  execute = (state: State): string => {
    if (state.simulatorRunning) {
      this.logger.info(`Simulator already running, routing to ${this.installAppNodeName}`);
      return this.installAppNodeName;
    }

    this.logger.info(`Simulator not running, routing to ${this.bootSimulatorNodeName}`);
    return this.bootSimulatorNodeName;
  };
}
