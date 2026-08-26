/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { StateGraph } from '@langchain/langgraph';
import { Logger } from '../../logging/logger.js';
import { WorkflowStateManager } from '../../checkpointing/workflowStateManager.js';
import type { DefaultOrchestratorInputSchema } from './metadata.js';

/**
 * Orchestrator configuration interface
 *
 * @template TInputSchema - The Zod input schema type for the orchestrator MCP tool.
 *   Defaults to the standard ORCHESTRATOR_INPUT_SCHEMA. When providing a custom schema,
 *   the OrchestratorTool subclass MUST also override extractUserInput() and
 *   extractWorkflowStateData() to map the custom schema's properties to the
 *   orchestrator's semantic needs.
 *
 * Example usage (default schema):
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
 *
 * Example usage (custom schema):
 * ```
 * const MY_CUSTOM_SCHEMA = z.object({
 *   payload: z.unknown().optional(),
 *   sessionState: z.object({ thread_id: z.string() }).default({ thread_id: '' }),
 * });
 *
 * const config: OrchestratorConfig<typeof MY_CUSTOM_SCHEMA> = {
 *   toolId: 'my-orchestrator',
 *   title: 'My Orchestrator',
 *   description: 'Orchestrates my workflow',
 *   workflow,
 *   inputSchema: MY_CUSTOM_SCHEMA,
 * };
 * ```
 */
export interface OrchestratorConfig<
  TInputSchema extends z.ZodObject<z.ZodRawShape> = DefaultOrchestratorInputSchema,
> {
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
   * Custom Zod input schema for the orchestrator MCP tool.
   *
   * Optional - defaults to ORCHESTRATOR_INPUT_SCHEMA, which provides the standard
   * `userInput` and `workflowStateData` properties.
   *
   * When providing a custom schema, the OrchestratorTool subclass MUST also override
   * `extractUserInput()` and `extractWorkflowStateData()` to map the custom schema's
   * properties to the orchestrator's semantic needs.
   */
  inputSchema?: TInputSchema;

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
