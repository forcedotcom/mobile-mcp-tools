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
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, isAbsolute } from 'path';
import { randomUUID } from 'crypto';

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
 * Response structure from `sf org display --json`
 */
interface SfOrgDisplayResponse {
  status: number;
  result: {
    instanceUrl: string;
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

    // Create a temporary SFDX project so that `sf project retrieve start` has
    // access to a sfdx-project.json file, regardless of the user's working directory.
    const tempDir = mkdtempSync(join(tmpdir(), 'magen-retrieve-'));
    const projectName = `tmpproj_${randomUUID().replace(/-/g, '').substring(0, 8)}`;

    try {
      // Get progress reporter from config (passed by orchestrator)
      const progressReporter = config?.configurable?.progressReporter;

      // Generate a temporary SFDX project
      const genResult = await this.commandRunner.execute(
        'sf',
        ['project', 'generate', '-n', projectName],
        {
          timeout: 60000,
          cwd: tempDir,
          progressReporter,
          commandName: 'Generate Temp Project',
        }
      );

      if (!genResult.success) {
        const errorMessage =
          genResult.stderr ||
          `Command failed with exit code ${genResult.exitCode ?? 'unknown'}${
            genResult.signal ? ` (signal: ${genResult.signal})` : ''
          }`;
        this.logger.error('Failed to generate temp SFDX project', new Error(errorMessage));
        return {
          workflowFatalErrorMessages: [
            `Failed to generate temporary SFDX project: ${errorMessage}`,
          ],
        };
      }

      const projectDir = join(tempDir, projectName);
      this.logger.debug('Created temp SFDX project', { projectDir });

      // Execute the sf project retrieve command in the temp project directory
      const retrieveArgs = [
        'project',
        'retrieve',
        'start',
        '-m',
        `ConnectedApp:${state.selectedConnectedAppName}`,
        '--json',
      ];

      // Add target org if selected (MSDK flow with org selection)
      if (state.selectedOrgUsername) {
        retrieveArgs.push('-o', state.selectedOrgUsername);
      }

      const result = await this.commandRunner.execute('sf', retrieveArgs, {
        timeout: 120000,
        cwd: projectDir,
        progressReporter,
        commandName: 'Retrieve Connected App Metadata',
      });
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

      // Resolve relative paths against the temp project directory
      if (xmlFilePath && !isAbsolute(xmlFilePath)) {
        xmlFilePath = join(projectDir, xmlFilePath);
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

      // Retrieve the login host (org instance URL) for MSDK apps
      let loginHost: string | undefined;
      try {
        const orgDisplayArgs = ['org', 'display', '--json'];
        if (state.selectedOrgUsername) {
          orgDisplayArgs.push('-o', state.selectedOrgUsername);
        }

        const orgDisplayResult = await this.commandRunner.execute('sf', orgDisplayArgs, {
          timeout: 60000,
          cwd: process.cwd(),
          progressReporter,
          commandName: 'Retrieve Org Info',
        });

        if (orgDisplayResult.success) {
          const orgResponse: SfOrgDisplayResponse = JSON.parse(orgDisplayResult.stdout);
          loginHost = orgResponse.result.instanceUrl;
          this.logger.info('Successfully retrieved org instance URL', { instanceUrl: loginHost });
        } else {
          this.logger.warn('Failed to retrieve org instance URL, using default', {
            stderr: orgDisplayResult.stderr,
          });
          loginHost = 'https://login.salesforce.com';
        }
      } catch (orgError) {
        this.logger.warn('Error retrieving org instance URL, using default', {
          error: orgError instanceof Error ? orgError.message : `${orgError}`,
        });
        loginHost = 'https://login.salesforce.com';
      }

      this.logger.info('Successfully retrieved Connected App credentials', {
        connectedAppName: state.selectedConnectedAppName,
        callbackUrl: credentials.callbackUrl,
        // Don't log the full consumer key for security
        consumerKeyPrefix: credentials.consumerKey.substring(0, 10) + '...',
        loginHost,
      });

      return {
        connectedAppClientId: credentials.consumerKey,
        connectedAppCallbackUri: credentials.callbackUrl,
        loginHost,
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
    } finally {
      // Clean up temp directory
      try {
        rmSync(tempDir, { recursive: true, force: true });
        this.logger.debug('Cleaned up temp project directory', { tempDir });
      } catch (cleanupError) {
        this.logger.warn('Failed to clean up temp directory', {
          tempDir,
          error: cleanupError instanceof Error ? cleanupError.message : `${cleanupError}`,
        });
      }
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
