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
import { State } from '../metadata.js';
import { existsSync, readFileSync } from 'fs';

/**
 * Response structure from `sf project retrieve start --json`
 *
 * The response contains both `files` and `fileProperties` arrays.
 * `files` may be empty in some SF CLI versions, so we fall back
 * to `fileProperties` to locate the retrieved metadata file.
 */
interface SfProjectRetrieveResponse {
  status: number;
  result: {
    done: boolean;
    status: string;
    success: boolean;
    files: Array<{
      fullName: string;
      type: string;
      state: string;
      filePath: string;
    }>;
    fileProperties: Array<{
      fullName: string;
      type: string;
      fileName: string;
    }>;
  };
}

/**
 * Node that retrieves Connected App metadata from Salesforce and extracts
 * the consumerKey and callbackUrl from the downloaded XML file.
 *
 * This is used for MSDK apps that need to retrieve connected app credentials
 * via the `sf` CLI instead of environment variables.
 */
export class RetrieveConnectedAppMetadataNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('retrieveConnectedAppMetadata');
    this.logger = logger ?? createComponentLogger('RetrieveConnectedAppMetadataNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    // Check if we already have connected app credentials
    if (state.connectedAppClientId && state.connectedAppCallbackUri) {
      this.logger.debug('Connected app credentials already exist in state, skipping retrieval');
      return {};
    }

    // Validate that we have a selected connected app
    if (!state.selectedConnectedAppName) {
      this.logger.error('No connected app selected for retrieval');
      return {
        workflowFatalErrorMessages: [
          'No Connected App selected. Please select a Connected App first.',
        ],
      };
    }

    this.logger.info(`Retrieving metadata for Connected App: ${state.selectedConnectedAppName}`);

    try {
      // Get progress reporter from config (passed by orchestrator)
      const progressReporter = config?.configurable?.progressReporter;

      // Execute the sf project retrieve command; Do not specify an output directory since it does not reliably work in child process.
      const result = await this.commandRunner.execute(
        'sf',
        [
          'project',
          'retrieve',
          'start',
          '-m',
          `ConnectedApp:${state.selectedConnectedAppName}`,
          '--json',
        ],
        {
          timeout: 120000,
          cwd: process.cwd(),
          progressReporter,
          commandName: 'Retrieve Connected App Metadata',
        }
      );
      this.logger.info('Result', { result });

      if (!result.success) {
        const errorMessage =
          result.stderr ||
          `Command failed with exit code ${result.exitCode ?? 'unknown'}${
            result.signal ? ` (signal: ${result.signal})` : ''
          }`;
        this.logger.error('Failed to retrieve connected app metadata', new Error(errorMessage));
        return {
          workflowFatalErrorMessages: [
            `Failed to retrieve Connected App metadata: ${errorMessage}. Please ensure you have access to the Connected App "${state.selectedConnectedAppName}".`,
          ],
        };
      }

      // Parse JSON response to find the filePath of the retrieved ConnectedApp
      let xmlFilePath: string | undefined;
      try {
        const response: SfProjectRetrieveResponse = JSON.parse(result.stdout);

        // Try result.files first (has absolute filePath)
        const connectedAppFile = response.result.files?.find(
          f => f.type === 'ConnectedApp' && f.fullName === state.selectedConnectedAppName
        );
        xmlFilePath = connectedAppFile?.filePath;
      } catch (parseError) {
        this.logger.error(
          'Failed to parse sf project retrieve JSON response',
          parseError instanceof Error ? parseError : new Error(`${parseError}`)
        );
      }

      if (!xmlFilePath || !existsSync(xmlFilePath)) {
        this.logger.error(
          `Connected App XML file not found. Parsed filePath: ${xmlFilePath ?? 'undefined'}`
        );
        return {
          workflowFatalErrorMessages: [
            `Connected App metadata file not found for "${state.selectedConnectedAppName}". ` +
              `Parsed filePath: ${xmlFilePath ?? 'undefined'}`,
          ],
        };
      }

      // Read and parse the XML
      const xmlContent = readFileSync(xmlFilePath, 'utf-8');
      const credentials = this.parseConnectedAppXml(xmlContent);

      if (!credentials.consumerKey || !credentials.callbackUrl) {
        this.logger.error(
          `Failed to extract credentials from Connected App XML. hasConsumerKey: ${!!credentials.consumerKey}, hasCallbackUrl: ${!!credentials.callbackUrl}`
        );
        return {
          workflowFatalErrorMessages: [
            `Failed to extract OAuth credentials from Connected App "${state.selectedConnectedAppName}". Please ensure the Connected App has OAuth settings configured with a consumerKey and callbackUrl.`,
          ],
        };
      }

      this.logger.info('Successfully retrieved Connected App credentials', {
        connectedAppName: state.selectedConnectedAppName,
        callbackUrl: credentials.callbackUrl,
        // Don't log the full consumer key for security
        consumerKeyPrefix: credentials.consumerKey.substring(0, 10) + '...',
      });

      return {
        connectedAppClientId: credentials.consumerKey,
        connectedAppCallbackUri: credentials.callbackUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Failed to retrieve connected app metadata',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to retrieve Connected App metadata: ${errorMessage}`],
      };
    }
  };

  /**
   * Parses the Connected App XML and extracts consumerKey and callbackUrl.
   *
   * Expected XML structure:
   * ```xml
   * <ConnectedApp>
   *   <oauthConfig>
   *     <callbackUrl>...</callbackUrl>
   *     <consumerKey>...</consumerKey>
   *   </oauthConfig>
   * </ConnectedApp>
   * ```
   */
  private parseConnectedAppXml(xml: string): { consumerKey?: string; callbackUrl?: string } {
    const consumerKeyMatch = xml.match(/<consumerKey>([^<]+)<\/consumerKey>/);
    const callbackUrlMatch = xml.match(/<callbackUrl>([^<]+)<\/callbackUrl>/);

    return {
      consumerKey: consumerKeyMatch?.[1]?.trim(),
      callbackUrl: callbackUrlMatch?.[1]?.trim(),
    };
  }
}
