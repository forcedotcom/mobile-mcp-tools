/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../common.js';
import { spawnSync } from 'child_process';
import { TEMPLATE_LIST_SCHEMA, TemplateListOutput } from '../../common/schemas.js';
import { readFileSync, unlinkSync, openSync, closeSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class TemplateOptionsFetchNode extends BaseNode<State> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('fetchTemplateOptions');
    this.logger = logger ?? createComponentLogger('TemplateOptionsFetchNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have template options (e.g., when resuming from interrupt)
    // This prevents re-executing expensive operations when LangGraph re-runs the node after resume
    if (state.templateOptions) {
      this.logger.debug('Template options already exist in state, skipping fetch');
      return {}; // Return empty update to avoid overwriting existing state
    }

    // Execute the sf mobilesdk listtemplates command directly
    const platformLower = state.platform.toLowerCase();
    const command = `sf mobilesdk ${platformLower} listtemplates --templatesource=${MOBILE_SDK_TEMPLATES_PATH} --doc --json`;

    this.logger.debug(`Executing template options fetch command`, { command });

    let templateOptions: TemplateListOutput;

    try {
      // Use temporary file to capture output and avoid pipe buffer limits
      // This completely bypasses any OS-level pipe buffer size restrictions
      const outputFile = join(
        tmpdir(),
        `template-options-${Date.now()}-${Math.random().toString(36).substring(7)}.json`
      );
      let result: ReturnType<typeof spawnSync>;
      try {
        // Open file for writing stdout directly (avoids pipe buffer limits)
        const outputFd = openSync(outputFile, 'w');
        try {
          // Redirect stdout directly to file to avoid pipe buffer limits
          result = spawnSync(command, {
            encoding: 'utf-8',
            timeout: 30000,
            stdio: ['ignore', outputFd, 'pipe'], // stdin: ignore, stdout: file, stderr: pipe
            shell: true, // Execute through shell to handle command properly
          });

          if (result.error) {
            throw result.error;
          }

          if (result.status !== 0) {
            const errorMsg = result.stderr || 'Command failed';
            throw new Error(`Command failed with exit code ${result.status}: ${errorMsg}`);
          }
        } finally {
          closeSync(outputFd);
        }

        // Read the complete output from file
        const output = readFileSync(outputFile, 'utf-8');
        templateOptions = this.parseTemplateOutput(output);
      } finally {
        // Clean up temporary file
        try {
          unlinkSync(outputFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      const errorObj = error instanceof Error ? error : new Error(errorMessage);
      this.logger.error(`Failed to execute template options fetch command`, errorObj);
      return {
        workflowFatalErrorMessages: [`Failed to fetch template options: ${errorMessage}`],
      };
    }

    this.logger.info(`Fetched template options for ${templateOptions.templates.length} templates`);
    return {
      templateOptions,
    };
  };

  private parseTemplateOutput(output: string): TemplateListOutput {
    try {
      const parsed = JSON.parse(output);
      return TEMPLATE_LIST_SCHEMA.parse(parsed);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to parse template list output: ${errorMessage}`);
    }
  }
}
