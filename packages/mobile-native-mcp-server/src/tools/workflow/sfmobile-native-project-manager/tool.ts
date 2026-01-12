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
  WorkflowStateManager,
  DefaultCommandRunner,
  createMCPProgressReporter,
  ProgressReporter,
  type Logger,
  type WorkflowEnvironment,
  createWorkflowLogger,
  type OrchestratorInput,
} from '@salesforce/magen-mcp-workflow';
import { createMobileNativeWorkflow } from '../../../workflow/graph.js';
import { ORCHESTRATOR_TOOL } from './metadata.js';
import { DefaultBuildExecutor } from '../../../execution/index.js';
import { defaultTempDirectoryManager } from '../../../common.js';

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

    // Create execution dependencies
    const commandRunner = new DefaultCommandRunner(logger);
    const buildExecutor = new DefaultBuildExecutor(
      commandRunner,
      defaultTempDirectoryManager,
      logger
    );

    const config: OrchestratorConfig = {
      toolId: ORCHESTRATOR_TOOL.toolId,
      title: 'Salesforce Mobile Native Project Manager',
      description:
        'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.',
      workflow: createMobileNativeWorkflow(
        buildExecutor,
        commandRunner,
        defaultTempDirectoryManager
      ),
      stateManager: new WorkflowStateManager({
        environment,
        logger: mobileNativeWorkflowStateManagerLogger,
      }),
      logger: mobileNativeOrchestratorToolLogger,
    };

    super(server, config);
  }

  /**
   * Override createThreadConfig to include progressReporter in the config.
   * This allows any node to access it via config.configurable.progressReporter.
   */
  protected override createThreadConfig(threadId: string): {
    configurable: { thread_id: string; progressReporter?: ProgressReporter };
  } {
    return {
      configurable: {
        thread_id: threadId,
        progressReporter: this.currentProgressReporter,
      },
    };
  }

  /**
   * Override handleRequest to create progress reporter for each request.
   * Creates MCPProgressReporter from the MCP request context and stores it
   * so createThreadConfig can include it in the workflow config.
   */
  public override handleRequest = async (
    input: OrchestratorInput,
    extra?: {
      sendNotification?: (notification: { method: string; params?: unknown }) => Promise<void>;
      _meta?: { progressToken?: string };
    }
  ) => {
    // Extract sendNotification and progressToken from request context
    const sendNotification = extra?.sendNotification;
    const progressToken =
      extra?._meta?.progressToken ??
      `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create MCP progress reporter and store for createThreadConfig
    this.currentProgressReporter = createMCPProgressReporter(sendNotification, progressToken);

    this.logger.debug('Orchestrator tool called with input', input);
    try {
      const result = await this.processRequest(input);
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
