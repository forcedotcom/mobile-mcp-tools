/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  OrchestratorTool,
  OrchestratorConfig,
  OrchestratorInput,
  WorkflowStateManager,
  MCPProgressReporter,
  ProgressReporter,
  type Logger,
  type WorkflowEnvironment,
  createWorkflowLogger,
} from '@salesforce/magen-mcp-workflow';
import { createMobileNativeWorkflow } from '../../../workflow/graph.js';
import { ORCHESTRATOR_TOOL } from './metadata.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
/**
 * Mobile Native Orchestrator Tool
 *
 * Wraps the generic OrchestratorTool from @salesforce/magen-mcp-workflow with
 * mobile-specific workflow configuration and progress reporting.
 *
 * Progress reporting is passed to workflow nodes via LangGraph's config.configurable
 * mechanism, which is the proper pattern for runtime dependencies.
 */
export class MobileNativeOrchestrator extends OrchestratorTool {
  private currentProgressReporter: ProgressReporter | undefined;

  constructor(server: McpServer, logger?: Logger, environment: WorkflowEnvironment = 'production') {
    const mobileNativeOrchestratorToolLogger =
      logger ?? createWorkflowLogger('MobileNativeOrchestratorTool');
    const mobileNativeWorkflowStateManagerLogger =
      logger ?? createWorkflowLogger('MobileNativeWorkflowStateManager');

    const config: OrchestratorConfig = {
      toolId: ORCHESTRATOR_TOOL.toolId,
      title: 'Salesforce Mobile Native Project Manager',
      description:
        'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.',
      workflow: createMobileNativeWorkflow(logger),
      stateManager: new WorkflowStateManager({
        environment,
        logger: mobileNativeWorkflowStateManagerLogger,
      }),
      logger: mobileNativeOrchestratorToolLogger,
    };

    super(server, config);
  }

  /**
   * Override getProgressReporter to provide the current request's progress reporter.
   * The base class calls this when creating thread config for workflow invocation.
   */
  protected override getProgressReporter(): ProgressReporter | undefined {
    return this.currentProgressReporter;
  }

  /**
   * Override handleRequest to create progress reporter for each request.
   * Creates MCPProgressReporter from the MCP request context and stores it
   * so getProgressReporter can return it for the base class.
   */
  public override handleRequest = async (
    input: unknown,
    extra?: RequestHandlerExtra<ServerRequest, ServerNotification>
  ) => {
    if (!extra) {
      throw new Error(
        'MCP request context is required but was not provided. This indicates a configuration issue.'
      );
    }
    const { sendNotification } = extra;
    const progressToken = String(
      extra._meta?.progressToken ??
        `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );

    this.currentProgressReporter = new MCPProgressReporter(sendNotification, progressToken);

    this.logger.debug('Orchestrator tool called with input', input);
    try {
      const result = await this.processRequest(input as OrchestratorInput);
      this.logger.debug('Orchestrator returning result', result);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result),
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      this.logger.error('Error in orchestrator tool execution', error as Error);
      throw error;
    } finally {
      // Clear progress reporter after request completes
      this.currentProgressReporter = undefined;
    }
  };
}
