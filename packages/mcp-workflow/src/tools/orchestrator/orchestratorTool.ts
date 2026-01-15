/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Command } from '@langchain/langgraph';
import { createWorkflowLogger } from '../../logging/logger.js';
import { AbstractTool } from '../base/abstractTool.js';
import {
  MCPToolInvocationData,
  WORKFLOW_PROPERTY_NAMES,
  WorkflowStateData,
} from '../../common/metadata.js';
import type { BaseGraphConfig } from '../../common/graphConfig.js';
import type { ProgressReporter } from '../../execution/progressReporter.js';
import { WorkflowStateManager } from '../../checkpointing/workflowStateManager.js';
import { OrchestratorConfig } from './config.js';
import {
  OrchestratorInput,
  OrchestratorOutput,
  OrchestratorToolMetadata,
  createOrchestratorToolMetadata,
} from './metadata.js';

/**
 * Generate unique thread ID for workflow sessions
 */
function generateUniqueThreadId(): string {
  return `mmw-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Orchestrator Tool
 *
 * Orchestrates workflow execution using LangGraph.js for deterministic state management
 * and human-in-the-loop patterns for agentic task execution.
 *
 * The orchestrator accepts a configured StateGraph and manages:
 * - Thread-based session management
 * - Workflow interrupts and resumptions
 * - LLM orchestration prompts for tool invocation
 *
 * All state management and checkpointing responsibilities are delegated to WorkflowStateManager.
 */
export class OrchestratorTool extends AbstractTool<OrchestratorToolMetadata> {
  private readonly stateManager: WorkflowStateManager;

  constructor(
    server: McpServer,
    private readonly config: OrchestratorConfig
  ) {
    // Use provided logger or create workflow logger with component name
    const effectiveLogger = config.logger || createWorkflowLogger('OrchestratorTool');
    super(server, createOrchestratorToolMetadata(config), 'OrchestratorTool', effectiveLogger);

    // Initialize state manager (use provided or create default for production)
    this.stateManager =
      config.stateManager || new WorkflowStateManager({ environment: 'production' });
  }

  /**
   * Handle orchestrator requests - manages workflow state and execution
   */
  public handleRequest = async (input: OrchestratorInput) => {
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
    }
  };

  protected async processRequest(input: OrchestratorInput): Promise<OrchestratorOutput> {
    // Generate or use existing thread ID for workflow session
    let threadId = '';
    try {
      const parsedInput = this.toolMetadata.inputSchema.parse(input);
      threadId = parsedInput.workflowStateData.thread_id;
    } catch (error) {
      this.logger.error(
        'Error parsing orchestrator input. Starting a new workflow.',
        error as Error
      );
    }
    if (threadId === '') {
      threadId = generateUniqueThreadId();
    }
    const workflowStateData: WorkflowStateData = { thread_id: threadId };

    this.logger.info('Processing orchestrator request', {
      threadId,
      hasUserInput: !!input.userInput,
      isResumption: !!input.workflowStateData?.thread_id,
    });

    // Thread configuration for LangGraph - includes optional progress reporter
    const threadConfig = this.createThreadConfig(threadId, this.getProgressReporter());

    // Get checkpointer from state manager
    const checkpointer = await this.stateManager.createCheckpointer();

    // Compile workflow with checkpointer
    const compiledWorkflow = this.config.workflow.compile({ checkpointer });

    // Check for interrupted workflow state
    this.logger.debug('Checking for interrupted workflow state');
    let graphState = await compiledWorkflow.getState(threadConfig);
    const interruptedTask = graphState.tasks.find(task => task.interrupts.length > 0);

    let result;
    if (interruptedTask) {
      this.logger.info('Resuming interrupted workflow', {
        taskId: interruptedTask.id,
        interrupts: interruptedTask.interrupts.length,
      });

      // Resume workflow with user input from previous tool execution
      result = await compiledWorkflow.invoke(
        new Command({ resume: input.userInput }),
        threadConfig
      );
    } else {
      // Start new workflow session
      this.logger.info('Starting new workflow execution');
      result = await compiledWorkflow.invoke(
        {
          userInput: input.userInput,
        },
        threadConfig
      );
    }

    this.logger.debug('Processing workflow result');
    graphState = await compiledWorkflow.getState(threadConfig);
    if (graphState.next.length > 0) {
      // There are more nodes to execute.
      const mcpToolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> | undefined =
        '__interrupt__' in result
          ? (
              result.__interrupt__ as Array<{
                value: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>;
              }>
            )[0].value
          : undefined;

      if (!mcpToolInvocationData) {
        this.logger.error('Workflow completed without expected MCP tool invocation.');
        throw new Error('FATAL: Unexpected workflow state without an interrupt');
      }

      this.logger.info('Invoking next MCP tool', {
        toolName: mcpToolInvocationData.llmMetadata?.name,
      });

      // Create orchestration prompt
      const orchestrationPrompt = this.createOrchestrationPrompt(
        mcpToolInvocationData,
        workflowStateData
      );

      // Save the workflow state.
      await this.stateManager.saveCheckpointerState(checkpointer);

      return {
        orchestrationInstructionsPrompt: orchestrationPrompt,
      };
    }

    // Workflow completed.
    return {
      orchestrationInstructionsPrompt:
        'The workflow has concluded. No further workflow actions are forthcoming.',
    };
  }

  /**
   * Create the thread configuration for LangGraph workflow invocation.
   *
   * @param threadId - The thread ID for checkpointing
   * @param progressReporter - Optional progress reporter for long-running operations
   * @returns Configuration object for workflow invocation
   */
  protected createThreadConfig(
    threadId: string,
    progressReporter?: ProgressReporter
  ): { configurable: BaseGraphConfig } {
    return {
      configurable: {
        thread_id: threadId,
        progressReporter,
      },
    };
  }

  /**
   * Get the progress reporter for the current request.
   * Subclasses can override this to provide a progress reporter.
   *
   * @returns The progress reporter, or undefined if not available
   */
  protected getProgressReporter(): ProgressReporter | undefined {
    return undefined;
  }

  /**
   * Create orchestration prompt for LLM with embedded tool invocation data and workflow state
   */
  private createOrchestrationPrompt(
    mcpToolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>,
    workflowStateData: WorkflowStateData
  ): string {
    return `
# Your Role

You are participating in a workflow orchestration process. The current
(\`${this.toolMetadata.toolId}\`) MCP server tool is the orchestrator, and is sending
you instructions on what to do next. These instructions describe the next participating
MCP server tool to invoke, along with its input schema and input values.

# Your Task

Invoke the following MCP server tool:

**MCP Server Tool Name**: ${mcpToolInvocationData.llmMetadata?.name}
**MCP Server Tool Input Schema**:
\`\`\`json
${JSON.stringify(zodToJsonSchema(mcpToolInvocationData.llmMetadata?.inputSchema))}
\`\`\`
**MCP Server Tool Input Values**:
\`\`\`json
${JSON.stringify(mcpToolInvocationData.input)}
\`\`\`

## Additional Input: \`${WORKFLOW_PROPERTY_NAMES.workflowStateData}\`

\`${WORKFLOW_PROPERTY_NAMES.workflowStateData}\` is an additional input parameter that is
specified in the input schema above, and should be passed to the next MCP server tool
invocation, with the following object value:

\`\`\`json
${JSON.stringify(workflowStateData)}
\`\`\`

This represents opaque workflow state data that should be round-tripped back to the
\`${this.toolMetadata.toolId}\` MCP server tool orchestrator at the completion of the
next MCP server tool invocation, without modification. These instructions will be further
specified by the next MCP server tool invocation.

The MCP server tool you invoke will respond with its output, along with further
instructions for continuing the workflow.
`;
  }
}
