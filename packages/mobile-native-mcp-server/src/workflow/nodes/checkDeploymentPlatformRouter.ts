/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createComponentLogger } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

/**
 * Conditional router that routes to platform-specific deployment flows.
 */
export class CheckDeploymentPlatformRouter {
  private readonly iosDeploymentStartNodeName: string;
  private readonly androidDeploymentStartNodeName: string;
  private readonly failureNodeName: string;
  private readonly logger = createComponentLogger('CheckDeploymentPlatformRouter');

  constructor(
    iosDeploymentStartNodeName: string,
    androidDeploymentStartNodeName: string,
    failureNodeName: string
  ) {
    this.iosDeploymentStartNodeName = iosDeploymentStartNodeName;
    this.androidDeploymentStartNodeName = androidDeploymentStartNodeName;
    this.failureNodeName = failureNodeName;
  }

  execute = (state: State): string => {
    if (!state.platform) {
      this.logger.warn('No platform specified for deployment, routing to failure');
      return this.failureNodeName;
    }

    if (state.platform === 'iOS') {
      this.logger.info(`Routing to iOS deployment flow: ${this.iosDeploymentStartNodeName}`);
      return this.iosDeploymentStartNodeName;
    } else if (state.platform === 'Android') {
      this.logger.info(
        `Routing to Android deployment flow: ${this.androidDeploymentStartNodeName}`
      );
      return this.androidDeploymentStartNodeName;
    } else {
      this.logger.warn(`Unsupported platform: ${state.platform}, routing to failure`);
      return this.failureNodeName;
    }
  };
}
