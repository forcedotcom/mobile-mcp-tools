/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  BaseNode,
  createComponentLogger,
  Logger,
  CommandRunner,
  WorkflowRunnableConfig,
} from '@salesforce/magen-mcp-workflow';
import { ConnectedAppInfo, State } from '../metadata.js';

/**
 * Response structure from `sf org list metadata -m ConnectedApp --json`
 */
interface SfOrgListMetadataResponse {
  status: number;
  result: Array<{
    createdById: string;
    createdByName: string;
    createdDate: string;
    fileName: string;
    fullName: string;
    id: string;
    lastModifiedById: string;
    lastModifiedByName: string;
    lastModifiedDate: string;
    type: string;
  }>;
  warnings: string[];
}

/**
 * Node that fetches the list of Connected Apps from the user's Salesforce org.
 * This is used for MSDK apps that need to retrieve connected app credentials
 * via the `sf` CLI instead of environment variables.
 */
export class FetchConnectedAppListNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('fetchConnectedAppList');
    this.logger = logger ?? createComponentLogger('FetchConnectedAppListNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    // Check if we already have connected app list (e.g., when resuming from interrupt)
    if (state.connectedAppList && state.connectedAppList.length > 0) {
      this.logger.debug('Connected app list already exists in state, skipping fetch');
      return {};
    }

    this.logger.info('Fetching list of Connected Apps from Salesforce org');

    try {
      // Get progress reporter from config (passed by orchestrator)
      const progressReporter = config?.configurable?.progressReporter;

      // Execute the sf org list metadata command
      const result = await this.commandRunner.execute(
        'sf',
        ['org', 'list', 'metadata', '-m', 'ConnectedApp', '--json'],
        {
          timeout: 60000,
          cwd: process.cwd(),
          progressReporter,
          commandName: 'Fetch Connected App List',
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr ||
          `Command failed with exit code ${result.exitCode ?? 'unknown'}${
            result.signal ? ` (signal: ${result.signal})` : ''
          }`;
        this.logger.error('Failed to fetch connected app list', new Error(errorMessage));
        return {
          workflowFatalErrorMessages: [
            `Failed to fetch Connected Apps from org: ${errorMessage}. Please ensure you have a valid Salesforce org connection using 'sf org login'.`,
          ],
        };
      }

      // Parse the JSON response
      const response = this.parseResponse(result.stdout);

      if (!response.result || response.result.length === 0) {
        this.logger.info('No Connected Apps found in the org');
        // Return empty list - the router will handle routing to completion
        return {
          connectedAppList: [],
        };
      }

      // Extract fullName and createdByName from the response
      const connectedAppList: ConnectedAppInfo[] = response.result.map(app => ({
        fullName: app.fullName,
        createdByName: app.createdByName,
      }));

      this.logger.info(`Found ${connectedAppList.length} Connected App(s) in the org`);

      return {
        connectedAppList,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Failed to fetch connected app list',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [
          `Failed to fetch Connected Apps: ${errorMessage}. Please ensure the Salesforce CLI is installed and you have a valid org connection.`,
        ],
      };
    }
  };

  private parseResponse(output: string): SfOrgListMetadataResponse {
    try {
      const parsed = JSON.parse(output) as SfOrgListMetadataResponse;

      if (parsed.status !== 0) {
        throw new Error(`Command returned non-zero status: ${parsed.status}`);
      }

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to parse connected app list response: ${errorMessage}`);
    }
  }
}
