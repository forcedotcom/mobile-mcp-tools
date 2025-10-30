/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BaseCheckpointSaver, Command, MemorySaver } from '@langchain/langgraph';
import { getWorkflowStateStorePath } from '../../../../utils/wellKnownDirectory.js';
import { PRD_ORCHESTRATOR_TOOL, PRDOrchestratorInput, PRDOrchestratorOutput } from './metadata.js';
import { Logger, createWorkflowLogger } from '../../../../logging/logger.js';
import { AbstractTool } from '../../../base/abstractTool.js';
import { MCPToolInvocationData, WORKFLOW_PROPERTY_NAMES } from '../../../../common/metadata.js';
import { PRDState } from '../../../../workflow/magi/prd/metadata.js';
import { JsonCheckpointSaver } from '../../../../workflow/jsonCheckpointer.js';
import { WorkflowStatePersistence } from '../../../../workflow/workflowStatePersistence.js';
import { prdGenerationWorkflow } from '../../../../workflow/magi/prd/graph.js';

/**
 * Generate unique thread ID for PRD workflow sessions
 */
function generateUniquePRDThreadId(): string {
  return `prd-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * PRD Generation Orchestrator Tool
 *
 * Implements the sfmobile-native-prd-orchestrator tool that orchestrates the complete
 * PRD generation workflow using LangGraph.js for deterministic state management
 * and human-in-the-loop patterns for agentic task execution.
 */
export class PRDGenerationOrchestrator extends AbstractTool<typeof PRD_ORCHESTRATOR_TOOL> {
  private readonly useMemoryForTesting: boolean;
  private checkpointer?: BaseCheckpointSaver;

  constructor(server: McpServer, logger?: Logger, useMemoryForTesting = false) {
    // Use provided logger (for testing) or create workflow logger (for production)
    const effectiveLogger = logger || createWorkflowLogger('PRDGenerationOrchestrator');
    super(server, PRD_ORCHESTRATOR_TOOL, 'PRDGenerationOrchestrator', effectiveLogger);
    this.useMemoryForTesting = useMemoryForTesting;
  }

  /**
   * Handle PRD orchestrator requests
   */
  public handleRequest = async (input: PRDOrchestratorInput) => {
    this.logger.debug('PRD Orchestrator tool called with input', input);
    try {
      const result = await this.processRequest(input);
      this.logger.debug('PRD Orchestrator returning result', result);

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
      this.logger.error('Error in PRD orchestrator tool execution', error as Error);
      throw error;
    }
  };

  /**
   * Process the PRD orchestrator request
   */
  private async processRequest(input: PRDOrchestratorInput): Promise<PRDOrchestratorOutput> {
    // Generate or use existing thread ID for PRD workflow session
    let threadId = '';
    try {
      const parsedInput = PRD_ORCHESTRATOR_TOOL.inputSchema.parse(input);
      threadId = parsedInput.workflowStateData?.thread_id || '';
    } catch (error) {
      this.logger.error(
        'Error parsing PRD orchestrator input. Starting a new workflow.',
        error as Error
      );
    }
    if (threadId === '') {
      threadId = generateUniquePRDThreadId();
    }

    this.logger.info('Processing PRD orchestrator request', {
      threadId,
      hasUserInput: !!input.userInput,
      isResumption: !!input.workflowStateData?.thread_id,
    });

    // Thread configuration for LangGraph
    const threadConfig = { configurable: { thread_id: threadId } };

    // Initialize checkpointer for state persistence
    const checkpointer = await this.getOrCreateCheckpointer();

    // Compile PRD workflow with checkpointer
    const compiledWorkflow = prdGenerationWorkflow.compile({ checkpointer });

    // Check for interrupted workflow state
    this.logger.info('Checking for interrupted PRD workflow state');
    let graphState = await compiledWorkflow.getState(threadConfig);
    this.logger.info('Current graph state', {
      tasks: graphState.tasks.length,
      next: graphState.next.length,
      tasksWithInterrupts: graphState.tasks.filter(task => task.interrupts.length > 0).length,
    });
    const interruptedTask = graphState.tasks.find(task => task.interrupts.length > 0);

    let result: PRDState;
    if (interruptedTask) {
      this.logger.info('Resuming interrupted PRD workflow', {
        taskId: interruptedTask.id,
        interrupts: interruptedTask.interrupts.length,
        userInput: input.userInput,
      });

      // Resume workflow with user input from previous tool execution
      result = await compiledWorkflow.invoke(
        new Command({ resume: input.userInput }),
        threadConfig
      );

      this.logger.info('Resumed workflow result', { result });
    } else {
      // Start new PRD workflow session
      this.logger.info('Starting new PRD workflow execution');

      // Initialize state with user input - validation will be handled by workflow nodes
      const initialState: Partial<PRDState> = {
        userInput: input.userInput,
        functionalRequirements: [],
        gapAnalysisScore: 0,
        identifiedGaps: [],
        shouldIterate: false,
        userIterationOverride: undefined,
        prdContent: '',
        prdStatus: {
          author: 'PRD Generator',
          lastModified: new Date().toISOString(),
          status: 'draft' as const,
        },
        isPrdApproved: false,
      };

      result = await compiledWorkflow.invoke(initialState, threadConfig);
    }

    this.logger.debug('Processing PRD workflow result');
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
        this.logger.error('PRD workflow completed without expected MCP tool invocation.');
        throw new Error('FATAL: Unexpected PRD workflow state without an interrupt');
      }

      if (mcpToolInvocationData) {
        this.logger.info('PRD workflow interrupted for tool execution', {
          toolName: mcpToolInvocationData.llmMetadata.name,
        });

        // Save workflow state for resumption
        await this.saveCheckpointerState(checkpointer, threadId);

        // Create orchestration prompt
        const orchestrationPrompt = this.createOrchestrationPrompt(mcpToolInvocationData, {
          thread_id: threadId,
        });

        return {
          orchestrationInstructionsPrompt: orchestrationPrompt,
        };
      }
    }

    // Workflow completed or no interruption
    this.logger.info('PRD workflow completed', {
      threadId,
    });

    return {
      orchestrationInstructionsPrompt:
        'The PRD generation workflow has concluded. No further workflow actions are forthcoming.',
    };
  }

  /**
   * Save checkpointer state for resumption
   */
  private async saveCheckpointerState(
    checkpointer: BaseCheckpointSaver,
    threadId: string
  ): Promise<void> {
    try {
      // If we have a JSONCheckpointSaver (standard, non-test-env case), we need to persist
      // our state to disk.
      if (checkpointer instanceof JsonCheckpointSaver) {
        const exportedState = await checkpointer.exportState();
        const workflowStateStorePath = getWorkflowStateStorePath();
        const statePersistence = new WorkflowStatePersistence(workflowStateStorePath);
        await statePersistence.writeState(exportedState);
        this.logger.info('PRD checkpointer state successfully persisted', { threadId });
      }
    } catch (error) {
      this.logger.error('Failed to save PRD workflow state', error as Error);
    }
  }

  /**
   * Get or create checkpointer for state persistence
   */
  private async getOrCreateCheckpointer(): Promise<BaseCheckpointSaver> {
    if (!this.checkpointer) {
      this.checkpointer = await this.createCheckpointer(this.useMemoryForTesting);
    }
    return this.checkpointer;
  }

  /**
   * Create checkpointer for state persistence
   */
  private async createCheckpointer(useMemoryForTesting: boolean): Promise<BaseCheckpointSaver> {
    if (useMemoryForTesting) {
      // Use MemorySaver for testing
      return new MemorySaver();
    }

    // Load checkpointer store data from .magen directory
    const workflowStateStorePath = getWorkflowStateStorePath();
    const checkpointer = new JsonCheckpointSaver();
    const statePersistence = new WorkflowStatePersistence(workflowStateStorePath);

    // Import the serialized state from disk if it exists
    const serializedState = await statePersistence.readState();
    if (serializedState) {
      this.logger.info('Importing existing PRD checkpointer state');
      await checkpointer.importState(serializedState);
    } else {
      this.logger.info('No existing PRD state found, starting with fresh checkpointer');
    }

    return checkpointer;
  }

  /**
   * Create orchestration prompt for LLM with embedded tool invocation data and workflow state
   */
  private createOrchestrationPrompt(
    mcpToolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>,
    workflowStateData: { thread_id: string }
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
