/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../common.js';
import { execSync } from 'child_process';
import z from 'zod';

const TEMPLATE_DETAIL_SCHEMA = z.any(); // The template detail structure can vary, so we use z.any() for flexibility

export class TemplateDetailFetchNode extends BaseNode<State> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('fetchTemplateDetails');
    this.logger = logger ?? createComponentLogger('TemplateDetailFetchNode');
  }

  execute = (state: State): Partial<State> => {
    try {
      if (!state.templateCandidates || state.templateCandidates.length === 0) {
        this.logger.warn('No template candidates found in state');
        return {
          workflowFatalErrorMessages: ['No template candidates available for detailed fetching'],
        };
      }

      const platformLower = state.platform.toLowerCase();
      const templateDetails: Record<string, unknown> = {};

      // Fetch detailed information for each candidate
      for (const candidate of state.templateCandidates) {
        try {
          const command = `sf mobilesdk ${platformLower} describetemplate --templatesource=${MOBILE_SDK_TEMPLATES_PATH} --template=${candidate} --doc --json`;

          this.logger.debug(`Fetching template details`, { candidate, command });

          const output = execSync(command, { encoding: 'utf-8', timeout: 30000 });
          const detail = this.parseTemplateDetailOutput(output);

          templateDetails[candidate] = detail;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : `${error}`;
          this.logger.error(
            `Failed to fetch details for template ${candidate}`,
            error instanceof Error ? error : new Error(errorMessage)
          );
          // Continue with other candidates even if one fails
          templateDetails[candidate] = {
            error: `Failed to fetch template details: ${errorMessage}`,
          };
        }
      }

      this.logger.info(`Fetched details for ${Object.keys(templateDetails).length} templates`);
      return {
        templateDetails,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        workflowFatalErrorMessages: [`Error during template detail fetching: ${errorMessage}`],
      };
    }
  };

  private parseTemplateDetailOutput(output: string): unknown {
    try {
      const parsed = JSON.parse(output);

      // The sf mobilesdk describetemplate command may return different structures
      // Try to extract the template detail from various possible structures
      let templateData = parsed;

      // If it's wrapped in a result property
      if (parsed.result) {
        templateData = parsed.result;
      }

      // If it's wrapped in outputContent (similar to platform check)
      if (parsed.outputContent) {
        templateData = parsed.outputContent;
      }

      // Validate the structure (using z.any() for flexibility)
      TEMPLATE_DETAIL_SCHEMA.parse(templateData);

      return templateData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to parse template detail output: ${errorMessage}`);
    }
  }
}
