/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, Logger, ToolExecutor } from '@salesforce/magen-mcp-workflow';
import {
  BuildValidationService,
  BuildValidationServiceProvider,
} from '../services/buildValidationService.js';

export class BuildValidationNode extends BaseNode<State> {
  private readonly buildValidationService: BuildValidationServiceProvider;

  constructor(
    buildValidationService?: BuildValidationServiceProvider,
    toolExecutor?: ToolExecutor,
    logger?: Logger
  ) {
    super('validateBuild');
    this.buildValidationService =
      buildValidationService ?? new BuildValidationService(toolExecutor, logger);
  }

  execute = (state: State): Partial<State> => {
    // Increment build attempt count
    const attemptCount = (state.buildAttemptCount ?? 0) + 1;

    const result = this.buildValidationService.executeBuild({
      platform: state.platform,
      projectPath: state.projectPath,
      projectName: state.projectName,
    });

    return {
      buildSuccessful: result.buildSuccessful,
      // Reset attempt count to 0 on success, so if we return to build validation
      // later in the workflow, we start fresh
      buildAttemptCount: result.buildSuccessful ? 0 : attemptCount,
      buildOutputFilePath: result.buildOutputFilePath,
    };
  };
}
