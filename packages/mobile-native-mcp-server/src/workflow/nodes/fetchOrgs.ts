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
import { OrgInfo, State } from '../metadata.js';

/**
 * Response structure from `sf org list --json`
 */
interface SfOrgListResponse {
  status: number;
  result: {
    devHubs: Array<{
      username: string;
      alias?: string;
      connectedStatus: string;
    }>;
  };
  warnings: string[];
}

/**
 * Node that fetches the list of connected Salesforce orgs.
 * Filters devHubs to only include orgs with connectedStatus === 'Connected'.
 */
export class FetchOrgsNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('fetchOrgs');
    this.logger = logger ?? createComponentLogger('FetchOrgsNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    // Check if we already have org list (e.g., when resuming from interrupt)
    if (state.orgList && state.orgList.length > 0) {
      this.logger.debug('Org list already exists in state, skipping fetch');
      return {};
    }

    this.logger.info('Fetching list of connected Salesforce orgs');

    try {
      // Get progress reporter from config (passed by orchestrator)
      const progressReporter = config?.configurable?.progressReporter;

      // Execute the sf org list command
      const result = await this.commandRunner.execute('sf', ['org', 'list', '--json'], {
        timeout: 60000,
        cwd: process.cwd(),
        progressReporter,
        commandName: 'Fetch Org List',
      });

      if (!result.success) {
        const errorMessage =
          result.stderr ||
          `Command failed with exit code ${result.exitCode ?? 'unknown'}${
            result.signal ? ` (signal: ${result.signal})` : ''
          }`;
        this.logger.error('Failed to fetch org list', new Error(errorMessage));
        return {
          workflowFatalErrorMessages: [
            `Failed to fetch Salesforce orgs: ${errorMessage}. Please ensure the Salesforce CLI is installed and you have authenticated orgs.`,
          ],
        };
      }

      // Parse the JSON response
      const response = this.parseResponse(result.stdout);

      // Filter to only connected devHubs
      const devHubs = response.result.devHubs || [];
      const connectedOrgs: OrgInfo[] = devHubs
        .filter(org => org.connectedStatus === 'Connected')
        .map(org => ({
          username: org.username,
          ...(org.alias ? { alias: org.alias } : {}),
        }));

      if (connectedOrgs.length === 0) {
        this.logger.info('No connected orgs found');
        return {
          orgList: [],
        };
      }

      this.logger.info(`Found ${connectedOrgs.length} connected org(s)`);

      return {
        orgList: connectedOrgs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Failed to fetch org list',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [
          `Failed to fetch Salesforce orgs: ${errorMessage}. Please ensure the Salesforce CLI is installed and you have authenticated orgs.`,
        ],
      };
    }
  };

  private parseResponse(output: string): SfOrgListResponse {
    try {
      const parsed = JSON.parse(output) as SfOrgListResponse;

      if (parsed.status !== 0) {
        throw new Error(`Command returned non-zero status: ${parsed.status}`);
      }

      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to parse org list response: ${errorMessage}`);
    }
  }
}
