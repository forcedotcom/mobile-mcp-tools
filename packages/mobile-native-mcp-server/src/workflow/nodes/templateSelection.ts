/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  AbstractToolNode,
  Logger,
  MCPToolInvocationData,
  ToolExecutor,
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import { TEMPLATE_SELECTION_TOOL } from '../../tools/plan/sfmobile-native-template-selection/metadata.js';
import { State, TemplatePropertiesMetadata } from '../metadata.js';

export class TemplateSelectionNode extends AbstractToolNode<State> {
  protected readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('selectTemplate', toolExecutor, logger);
    this.logger = logger ?? createComponentLogger('TemplateSelectionNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have a selected template (e.g., when resuming from interrupt)
    // This prevents re-executing when LangGraph re-runs the node after resume
    if (state.selectedTemplate) {
      this.logger.debug('Template already selected, skipping selection');
      return {}; // Return empty update to avoid overwriting existing state
    }

    if (!state.templateOptions) {
      return {
        workflowFatalErrorMessages: ['No template options available for selection'],
      };
    }

    const toolInvocationData: MCPToolInvocationData<typeof TEMPLATE_SELECTION_TOOL.inputSchema> = {
      llmMetadata: {
        name: TEMPLATE_SELECTION_TOOL.toolId,
        description: TEMPLATE_SELECTION_TOOL.description,
        inputSchema: TEMPLATE_SELECTION_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        templateOptions: state.templateOptions,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      TEMPLATE_SELECTION_TOOL.resultSchema
    );

    if (!validatedResult.selectedTemplate) {
      return {
        workflowFatalErrorMessages: ['Template selection did not return a selectedTemplate'],
      };
    }

    // Extract template properties metadata from the selected template's options
    const templatePropertiesMetadata = this.extractTemplatePropertiesMetadata(
      validatedResult.selectedTemplate,
      state.templateOptions
    );

    return {
      selectedTemplate: validatedResult.selectedTemplate,
      templatePropertiesMetadata,
    };
  };

  private extractTemplatePropertiesMetadata(
    selectedTemplate: string,
    templateOptions: State['templateOptions']
  ): TemplatePropertiesMetadata | undefined {
    try {
      // Find the selected template in the templates array
      const template = templateOptions.templates.find(t => t.path === selectedTemplate);
      if (!template) {
        this.logger.warn(`Template not found in templateOptions: ${selectedTemplate}`);
        return undefined;
      }

      // Navigate to metadata.templatePrerequisites.templateProperties
      const metadata = template.metadata as Record<string, unknown> | undefined;
      if (!metadata) {
        this.logger.debug(`No metadata found for template ${selectedTemplate}`);
        return undefined;
      }

      const templatePrerequisites = metadata.templatePrerequisites as
        | Record<string, unknown>
        | undefined;
      if (!templatePrerequisites) {
        this.logger.debug(`No templatePrerequisites found for template ${selectedTemplate}`);
        return undefined;
      }

      const templateProperties = templatePrerequisites.templateProperties as
        | Record<string, unknown>
        | undefined;
      if (!templateProperties || Object.keys(templateProperties).length === 0) {
        this.logger.debug(`No templateProperties found for template ${selectedTemplate}`);
        return undefined;
      }

      // Convert template properties to TemplatePropertiesMetadata format
      const propertiesMetadata: TemplatePropertiesMetadata = {};

      for (const [propertyName, propertyValue] of Object.entries(templateProperties)) {
        // Property can be a simple value or an object with value, required, description
        if (
          typeof propertyValue === 'object' &&
          propertyValue !== null &&
          !Array.isArray(propertyValue)
        ) {
          const propObj = propertyValue as Record<string, unknown>;
          propertiesMetadata[propertyName] = {
            value: propObj.value !== undefined ? String(propObj.value) : undefined,
            required: typeof propObj.required === 'boolean' ? propObj.required : false,
            description: typeof propObj.description === 'string' ? propObj.description : '',
          };
        } else {
          // Simple value - treat as optional with empty description
          propertiesMetadata[propertyName] = {
            value: propertyValue !== undefined ? String(propertyValue) : undefined,
            required: false,
            description: '',
          };
        }
      }

      this.logger.info(
        `Extracted ${Object.keys(propertiesMetadata).length} template properties for ${selectedTemplate}`
      );
      return Object.keys(propertiesMetadata).length > 0 ? propertiesMetadata : undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        `Failed to extract template properties metadata`,
        error instanceof Error ? error : new Error(errorMessage)
      );
      return undefined;
    }
  }
}
