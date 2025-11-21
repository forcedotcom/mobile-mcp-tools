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
import { TEMPLATE_DISCOVERY_TOOL } from '../../tools/plan/sfmobile-native-template-discovery/metadata.js';
import { State } from '../metadata.js';

export class TemplateCandidateSelectionNode extends AbstractToolNode<State> {
  protected readonly logger: Logger;

  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('selectTemplateCandidates', toolExecutor, logger);
    this.logger = logger ?? createComponentLogger('TemplateCandidateSelectionNode');
  }

  execute = (state: State): Partial<State> => {
    // Check if we already have template candidates (e.g., when resuming from interrupt)
    // This prevents re-executing when LangGraph re-runs the node after resume
    if (state.templateCandidates && state.templateCandidates.length > 0) {
      this.logger.debug('Template candidates already exist in state, skipping candidate selection');
      return {}; // Return empty update to avoid overwriting existing state
    }

    // Validate that template options are available in state
    if (!state.templateOptions) {
      return {
        workflowFatalErrorMessages: [
          'Template options not found in state. TemplateOptionsFetchNode must run before TemplateCandidateSelectionNode.',
        ],
      };
    }

    // Call the tool with the template options from state
    // Note: executeToolWithLogging calls interrupt() which pauses the workflow.
    // When LangGraph resumes, this node will be re-executed, but interrupt() will return
    // the result immediately instead of pausing again.
    // We don't wrap this in try-catch to allow the interrupt to propagate properly.
    const toolInvocationData: MCPToolInvocationData<typeof TEMPLATE_DISCOVERY_TOOL.inputSchema> = {
      llmMetadata: {
        name: TEMPLATE_DISCOVERY_TOOL.toolId,
        description: TEMPLATE_DISCOVERY_TOOL.description,
        inputSchema: TEMPLATE_DISCOVERY_TOOL.inputSchema,
      },
      input: {
        platform: state.platform,
        templateOptions: state.templateOptions,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      TEMPLATE_DISCOVERY_TOOL.resultSchema
    );

    if (!validatedResult.templateCandidates || validatedResult.templateCandidates.length === 0) {
      return {
        workflowFatalErrorMessages: ['Template candidate selection did not return any template candidates'],
      };
    }

    return {
      templateCandidates: validatedResult.templateCandidates,
    };
  };
}

