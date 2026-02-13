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
  ORG_SELECTION_TOOL,
  OrgInfoInput,
} from '../../tools/plan/sfmobile-native-org-selection/metadata.js';
import { State } from '../metadata.js';

/**
 * Node that prompts the user to select a Salesforce org from the available list.
 * This is used for MSDK apps that need to target a specific org for
 * connected app retrieval.
 */
export class SelectOrgNode extends AbstractToolNode<State> {
  protected readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('selectOrg', toolExecutor, logger);
    this.logger = logger ?? createComponentLogger('SelectOrgNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have a selected org (e.g., when resuming from interrupt)
    if (state.selectedOrgUsername) {
      this.logger.debug('Org already selected, skipping selection');
      return {};
    }

    // Validate that we have an org list
    if (!state.orgList || state.orgList.length === 0) {
      this.logger.error('No org list available for selection');
      return {
        workflowFatalErrorMessages: [
          'No Salesforce orgs available for selection. Please ensure you have connected orgs.',
        ],
      };
    }

    this.logger.info(`Presenting ${state.orgList.length} org(s) for user selection`);

    // Create NodeGuidanceData for direct guidance mode
    const nodeGuidanceData: NodeGuidanceData<typeof ORG_SELECTION_TOOL.resultSchema> = {
      nodeId: ORG_SELECTION_TOOL.toolId,
      taskGuidance: this.generateTaskGuidance(state.orgList),
      resultSchema: ORG_SELECTION_TOOL.resultSchema,
      exampleOutput: JSON.stringify({ selectedOrgUsername: 'user@example.com' }),
    };

    // Execute with NodeGuidanceData (direct guidance mode)
    const validatedResult = this.executeToolWithLogging(
      nodeGuidanceData,
      ORG_SELECTION_TOOL.resultSchema
    );

    if (!validatedResult.selectedOrgUsername) {
      return {
        workflowFatalErrorMessages: ['Org selection did not return a selectedOrgUsername'],
      };
    }

    // Validate that the selected org exists in the list
    const selectedOrg = state.orgList.find(
      org => org.username === validatedResult.selectedOrgUsername
    );

    if (!selectedOrg) {
      this.logger.warn(
        `Selected org "${validatedResult.selectedOrgUsername}" not found in available list`
      );
      return {
        workflowFatalErrorMessages: [
          `Selected org "${validatedResult.selectedOrgUsername}" is not in the available list. Please select a valid org.`,
        ],
      };
    }

    this.logger.info(`User selected org: ${validatedResult.selectedOrgUsername}`);

    return {
      selectedOrgUsername: validatedResult.selectedOrgUsername,
    };
  };

  /**
   * Generates the task guidance for org selection.
   */
  private generateTaskGuidance(orgList: OrgInfoInput[]): string {
    const orgListFormatted = orgList
      .map((org, index) => {
        const aliasDisplay = org.alias ? ` (alias: ${org.alias})` : '';
        return `${index + 1}. **${org.username}**${aliasDisplay}`;
      })
      .join('\n');

    return dedent`
      # ROLE
      You are a Salesforce org selection assistant, responsible for helping the user choose the
      appropriate Salesforce org for their mobile application.

      # TASK
      Your job is to present the available connected Salesforce orgs to the user and request their
      selection. The user must provide the username of the org they want to use.

      # CONTEXT
      The following connected Salesforce orgs are available:

      ${orgListFormatted}

      # INSTRUCTIONS
      1. Present the list of available orgs to the user.
      2. Ask the user to provide the **username** of the org they want to use.
      3. **CRITICAL:** YOU MUST NOW WAIT for the user to provide their selection.
         - You CANNOT PROCEED FROM THIS STEP until the user has provided THEIR OWN selection.
         - Do NOT make assumptions or select an org on behalf of the user.

      # STRICT VALIDATION RULES
      - The user MUST select exactly ONE org from the list above.
      - REJECT any input that does not EXACTLY match one of the username values listed above.
      - REJECT empty or blank responses. An empty selection is NOT acceptable.
      - If the user provides an invalid selection, inform them that they MUST choose from the available list and repeat the request.
      - Do NOT proceed until a valid selection from the list has been provided.
    `;
  }
}
