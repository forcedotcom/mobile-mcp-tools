/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import { ensureMagiSddDirectory } from '../../../../utils/magiDirectory.js';

export class PRDMagiInitializationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('magiInitialization', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Initialize state with user input and default values
    // Only set defaults for fields that don't already exist (to avoid overwriting existing state)
    const initializedState: Partial<PRDState> = {
      userInput: state.userInput || {},
      // Only initialize these if they're not already set
      ...(state.gapAnalysisScore === undefined && { gapAnalysisScore: 0 }),
      ...(state.identifiedGaps === undefined && { identifiedGaps: [] }),
    };

    // Extract required values from userInput
    const projectPath = state.userInput?.projectPath as string;
    const userUtterance = state.userInput?.userUtterance as string;

    // Validate that projectPath is provided
    if (!projectPath || !userUtterance) {
      // NOTE: this should use a more sophisticated input collection tool - waiting for user input extraction tool to be refactored for re-use here.

      throw new Error(
        'Both projectPath and userUtterance are required but not provided in userInput. userInput should be a JSON object with the following properties: projectPath and userUtterance.'
      );
    }

    try {
      // Ensure the magi-sdd directory exists in the project path
      const prdWorkspacePath = ensureMagiSddDirectory(projectPath);
      this.logger?.info(`Verified/created magi-sdd directory at: ${prdWorkspacePath}`);

      // Return the initialized state with validated projectPath and userUtterance
      // Paths are now calculated from projectPath and featureId as needed
      return {
        ...initializedState,
        projectPath: projectPath,
        userUtterance: userUtterance,
      };
    } catch (error) {
      const errorMessage = `Failed to initialize magi-sdd directory in project path ${projectPath}: ${error instanceof Error ? error.message : String(error)}`;
      this.logger?.error(errorMessage);
      return {
        ...initializedState,
        prdWorkflowFatalErrorMessages: [errorMessage],
      };
    }
  };
}
