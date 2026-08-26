/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

/**
 * Simple router node that routes to platform-specific deployment flows.
 * The actual deployment nodes are added to the workflow graph separately.
 */
export class DeploymentNode extends BaseNode<State> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('deployApp');
    this.logger = logger ?? createComponentLogger('DeploymentNode');
  }

  execute = (_state: State): Partial<State> => {
    // This node just passes through - routing is handled by CheckDeploymentPlatformRouter
    this.logger.debug('Deployment node executed, routing will be handled by platform router');
    return {};
  };
}
