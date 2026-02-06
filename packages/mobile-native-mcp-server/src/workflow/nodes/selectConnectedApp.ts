/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractToolNode,
  Logger,
  NodeGuidanceData,
  ToolExecutor,
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import dedent from 'dedent';
import {
  CONNECTED_APP_SELECTION_TOOL,
  ConnectedAppInfoInput,
} from '../../tools/plan/sfmobile-native-connected-app-selection/metadata.js';
import { State } from '../metadata.js';

/**
 * Node that prompts the user to select a Connected App from the available list.
 * This is used for MSDK apps that need to retrieve connected app credentials
 * via the `sf` CLI instead of environment variables.
 */
export class SelectConnectedAppNode extends AbstractToolNode<State> {
  protected readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('selectConnectedApp', toolExecutor, logger);
    this.logger = logger ?? createComponentLogger('SelectConnectedAppNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have a selected connected app (e.g., when resuming from interrupt)
    if (state.selectedConnectedAppName) {
      this.logger.debug('Connected app already selected, skipping selection');
      return {};
    }

    // Validate that we have a connected app list
    if (!state.connectedAppList || state.connectedAppList.length === 0) {
      this.logger.error('No connected app list available for selection');
      return {
        workflowFatalErrorMessages: [
          'No Connected Apps available for selection. Please ensure Connected Apps exist in your Salesforce org.',
        ],
      };
    }

    this.logger.info(
      `Presenting ${state.connectedAppList.length} Connected App(s) for user selection`
    );

    // Create NodeGuidanceData for direct guidance mode
    const nodeGuidanceData: NodeGuidanceData<typeof CONNECTED_APP_SELECTION_TOOL.resultSchema> = {
      nodeId: CONNECTED_APP_SELECTION_TOOL.toolId,
      taskGuidance: this.generateTaskGuidance(state.connectedAppList),
      resultSchema: CONNECTED_APP_SELECTION_TOOL.resultSchema,
      exampleOutput: JSON.stringify({ selectedConnectedAppName: 'FirstApp' }),
    };

    // Execute with NodeGuidanceData (direct guidance mode)
    const validatedResult = this.executeToolWithLogging(
      nodeGuidanceData,
      CONNECTED_APP_SELECTION_TOOL.resultSchema
    );

    if (!validatedResult.selectedConnectedAppName) {
      return {
        workflowFatalErrorMessages: [
          'Connected App selection did not return a selectedConnectedAppName',
        ],
      };
    }

    // Validate that the selected app exists in the list
    const selectedApp = state.connectedAppList.find(
      app => app.fullName === validatedResult.selectedConnectedAppName
    );

    if (!selectedApp) {
      this.logger.warn(
        `Selected Connected App "${validatedResult.selectedConnectedAppName}" not found in available list`
      );
      return {
        workflowFatalErrorMessages: [
          `Selected Connected App "${validatedResult.selectedConnectedAppName}" is not in the available list. Please select a valid Connected App.`,
        ],
      };
    }

    this.logger.info(`User selected Connected App: ${validatedResult.selectedConnectedAppName}`);

    return {
      selectedConnectedAppName: validatedResult.selectedConnectedAppName,
    };
  };

  /**
   * Generates the task guidance for connected app selection.
   * Copied from SFMobileNativeConnectedAppSelectionTool.generateConnectedAppSelectionGuidance()
   */
  private generateTaskGuidance(connectedAppList: ConnectedAppInfoInput[]): string {
    const connectedAppListFormatted = connectedAppList
      .map((app, index) => `${index + 1}. **${app.fullName}** (created by: ${app.createdByName})`)
      .join('\n');

    return dedent`
      # ROLE
      You are a Connected App selection assistant, responsible for helping the user choose the appropriate
      Connected App for their mobile application's OAuth authentication.

      # TASK
      Your job is to present the available Connected Apps to the user and request their selection. The user
      must provide the fullName of the Connected App they want to use.

      # CONTEXT
      The following Connected Apps are available in the user's Salesforce org:

      ${connectedAppListFormatted}

      **Important Requirements:**
      The selected Connected App must be configured for mobile app authentication with:
      - Appropriate OAuth scopes (typically: Api, Web, RefreshToken)
      - A valid callback URL scheme for the mobile app

      # INSTRUCTIONS
      1. Present the list of available Connected Apps to the user.
      2. Ask the user to provide the **fullName** of the Connected App they want to use.
      3. **CRITICAL:** YOU MUST NOW WAIT for the user to provide their selection.
         - You CANNOT PROCEED FROM THIS STEP until the user has provided THEIR OWN selection.
         - Do NOT make assumptions or select a Connected App on behalf of the user.

      # STRICT VALIDATION RULES
      - The user MUST select exactly ONE Connected App from the list above.
      - REJECT any input that does not EXACTLY match one of the fullName values listed above.
      - REJECT empty or blank responses. An empty selection is NOT acceptable.
      - If the user provides an invalid selection, inform them that they MUST choose from the available list and repeat the request.
      - Do NOT proceed until a valid selection from the list has been provided.
    `;
  }
}
