/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../metadata.js';
import { PRDBaseNode } from './prdBaseNode.js';
import { Logger } from '../../../../logging/logger.js';

export class PRDFinalizationNode extends PRDBaseNode {
  constructor() {
    super('prdFinalization');
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Mark the workflow as complete
    return {
      workflowComplete: true,
    };
  };
}
