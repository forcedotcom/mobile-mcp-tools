/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode } from '@salesforce/magen-mcp-workflow';
import { ToolExecutor } from '@salesforce/magen-mcp-workflow';
import { Logger } from '@salesforce/magen-mcp-workflow';
import {
  BuildRecoveryService,
  BuildRecoveryServiceProvider,
} from '../services/buildRecoveryService.js';

export class BuildRecoveryNode extends BaseNode<State> {
  private readonly buildRecoveryService: BuildRecoveryServiceProvider;

  constructor(
    buildRecoveryService?: BuildRecoveryServiceProvider,
    toolExecutor?: ToolExecutor,
    logger?: Logger
  ) {
    super('buildRecovery');
    this.buildRecoveryService =
      buildRecoveryService ?? new BuildRecoveryService(toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Attempt recovery using the failed build output
    const result = this.buildRecoveryService.attemptRecovery({
      platform: state.platform,
      projectPath: state.projectPath,
      projectName: state.projectName,
      buildOutputFilePath: state.buildOutputFilePath!,
      attemptNumber: state.buildAttemptCount ?? 1,
    });

    // Track the fixes that were attempted
    const errorMessages = state.buildErrorMessages ?? [];
    if (result.fixesAttempted.length > 0) {
      errorMessages.push(
        `Recovery attempt ${state.buildAttemptCount}: ${result.fixesAttempted.join(', ')}`
      );
    } else {
      errorMessages.push(`Recovery attempt ${state.buildAttemptCount}: No fixes could be applied`);
    }

    return {
      buildErrorMessages: errorMessages,
      recoveryReadyForRetry: result.readyForRetry,
    };
  };
}
