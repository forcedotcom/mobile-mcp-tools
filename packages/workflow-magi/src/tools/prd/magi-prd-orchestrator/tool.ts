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
} from '@salesforce/magen-mcp-workflow';
import { prdGenerationWorkflow } from '../../../workflow/prd/graph.js';
import { PRD_ORCHESTRATOR_TOOL } from './metadata.js';

/**
 * PRD Generation Orchestrator Tool
 *
 * Wraps the generic OrchestratorTool from @salesforce/magen-mcp-workflow with
 * PRD-specific workflow configuration.
 */
export class PRDGenerationOrchestrator extends OrchestratorTool {
  constructor(server: McpServer, logger?: Logger, environment: WorkflowEnvironment = 'production') {
    const config: OrchestratorConfig = {
      toolId: PRD_ORCHESTRATOR_TOOL.toolId,
      title: 'Magi - PRD Orchestrator',
      description:
        'Orchestrates the end-to-end workflow for generating Product Requirements Documents.',
      workflow: prdGenerationWorkflow,
      stateManager: new WorkflowStateManager({
        environment,
        logger,
      }),
      logger,
    };

    super(server, config);
  }
}
