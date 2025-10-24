/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';

export class PRDMagiInitializationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('magiInitialization', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Initialize project path and ensure all required state properties are set
    const projectPath = state.projectPath || '/tmp/prd-project';

    return {
      projectPath: projectPath,
    };
  };
}
