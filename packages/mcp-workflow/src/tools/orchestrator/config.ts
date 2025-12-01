/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateGraph } from '@langchain/langgraph';
import { Logger } from '../../logging/logger.js';
import { WorkflowStateManager } from '../../checkpointing/workflowStateManager.js';

/**
 * Orchestrator configuration interface
 *
 * Example usage:
 * ```
 * const MyWorkflowState = Annotation.Root({ messages: Annotation<string[]> });
 * const workflow = new StateGraph(MyWorkflowState)
 *   .addNode('start', (state) => ({ messages: ['Started'] }))
 *   .addEdge(START, 'start')
 *   .addEdge('start', END);
 *
 * const config: OrchestratorConfig = {
 *   toolId: 'my-orchestrator',
 *   title: 'My Orchestrator',
 *   description: 'Orchestrates my workflow',
 *   workflow,
 * };
 * ```
 */
export interface OrchestratorConfig {
  /** Unique tool identifier for MCP registration */
  toolId: string;

  /** Extended tool title for display */
  title: string;

  /** Tool description for documentation */
  description: string;

  /**
   * The LangGraph StateGraph workflow definition (uncompiled)
   *
   * Note: StateGraph generic types are inferred from construction and don't need
   * to be specified here. The orchestrator will compile the workflow at runtime
   * with the appropriate checkpointer.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workflow: StateGraph<any, any, any, any, any, any, any, any>;

  /**
   * Workflow state manager for checkpointing and persistence
   *
   * Optional - if not provided, a default WorkflowStateManager will be created
   * with production environment settings.
   *
   * Provide a custom instance to:
   * - Use test environment (in-memory state, no file I/O)
   * - Customize well-known directory paths
   * - Inject a mock for testing
   */
  stateManager?: WorkflowStateManager;

  /**
   * Logger instance for workflow operations
   * Optional - defaults to logger using wellKnownDirectory for log files
   */
  logger?: Logger;
}
