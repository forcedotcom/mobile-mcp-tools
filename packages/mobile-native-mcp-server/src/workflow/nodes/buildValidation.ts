/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, WorkflowRunnableConfig } from '@salesforce/magen-mcp-workflow';
import { BuildExecutor } from '../../execution/build/buildExecutor.js';

export class BuildValidationNode extends BaseNode<State> {
  private readonly buildExecutor: BuildExecutor;

  constructor(buildExecutor: BuildExecutor) {
    super('validateBuild');
    this.buildExecutor = buildExecutor;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    // Increment build attempt count
    const attemptCount = (state.buildAttemptCount ?? 0) + 1;

    // Get progress reporter from config (passed by orchestrator)
    const progressReporter = config?.configurable?.progressReporter;

    // Execute build with progress reporter
    const result = await this.buildExecutor.execute(
      {
        platform: state.platform,
        projectPath: state.projectPath,
        projectName: state.projectName,
      },
      progressReporter
    );

    return {
      buildSuccessful: result.buildSuccessful,
      buildAttemptCount: result.buildSuccessful ? 0 : attemptCount,
      buildOutputFilePath: result.buildOutputFilePath,
    };
  };
}
