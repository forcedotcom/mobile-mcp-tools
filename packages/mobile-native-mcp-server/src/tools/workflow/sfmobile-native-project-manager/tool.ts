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
  type Logger,
  type WorkflowEnvironment,
  createWorkflowLogger,
} from '@salesforce/magen-mcp-workflow';
import { createMobileNativeWorkflow } from '../../../workflow/graph.js';
import { ORCHESTRATOR_TOOL } from './metadata.js';

/**
 * Mobile Native Orchestrator Tool
 *
 * Configures the generic OrchestratorTool from @salesforce/magen-mcp-workflow with
 * mobile-specific workflow configuration.
 *
 */
export class MobileNativeOrchestrator extends OrchestratorTool {
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
}
