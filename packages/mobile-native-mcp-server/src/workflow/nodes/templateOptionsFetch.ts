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
import { TEMPLATE_LIST_SCHEMA, TemplateListOutput } from '../../common/schemas.js';

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
      const output = execSync(command, { encoding: 'utf-8', timeout: 30000 });
      templateOptions = this.parseTemplateOutput(output);
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

      // The sf mobilesdk listtemplates command may return different structures
      // Try to extract the template list from various possible structures
      let templateData = parsed;

      // If it's wrapped in a result property
      if (parsed.result) {
        templateData = parsed.result;
      }

      // If it's wrapped in outputContent (similar to platform check)
      if (parsed.outputContent) {
        templateData = parsed.outputContent;
      }

      return TEMPLATE_LIST_SCHEMA.parse(templateData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to parse template list output: ${errorMessage}`);
    }
  }
}
