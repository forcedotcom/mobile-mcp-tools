import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { BaseCheckpointSaver, Command } from '@langchain/langgraph';
import { getWorkflowStateDatabasePath } from '../utils/wellKnownDirectory.js';
import { ORCHESTRATOR_TOOL } from '../registry/toolRegistry.js';
import {
  ORCHESTRATOR_OUTPUT_SCHEMA,
  OrchestratorOutput,
  OrchestratorInput,
  MCPToolInvocationData,
  WorkflowStateData,
} from './schemas.js';
import { mobileNativeWorkflow, MobileNativeWorkflowState } from './graph.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AbstractTool } from '../tools/base/abstractTool.js';

import { Logger, createWorkflowLogger } from '../logging/index.js';

/**
 * Generate unique thread ID for workflow sessions
 */
function generateUniqueThreadId(): string {
  return `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create and configure workflow checkpointer for state persistence
 *
 * @param useMemoryForTesting - If true, uses SQLite :memory: database for test isolation
 *
 */
function createCheckpointer(useMemoryForTesting = false): BaseCheckpointSaver {
  if (useMemoryForTesting) {
    // Use SQLite in-memory database for testing - no filesystem persistence
    return SqliteSaver.fromConnString(':memory:');
  }

  // Create SQLite checkpointer in .magen directory
  const dbPath = getWorkflowStateDatabasePath();
  return SqliteSaver.fromConnString(dbPath);
}

/**
 * Mobile Native Orchestrator Tool
 *
 * Implements the sfmobile-native-project-manager tool that orchestrates the complete
 * mobile app generation workflow using LangGraph.js for deterministic state management
 * and human-in-the-loop patterns for agentic task execution.
 */
export class MobileNativeOrchestrator extends AbstractTool {
  public readonly toolId = ORCHESTRATOR_TOOL.toolId;
  public readonly name = ORCHESTRATOR_TOOL.name;
  public readonly title = ORCHESTRATOR_TOOL.title;
  public readonly description = ORCHESTRATOR_TOOL.description;
  public readonly inputSchema = ORCHESTRATOR_TOOL.inputSchema;
  public readonly outputSchema = ORCHESTRATOR_OUTPUT_SCHEMA;

  private readonly useMemoryForTesting: boolean;

  constructor(server: McpServer, logger?: Logger, useMemoryForTesting = false) {
    // Use provided logger (for testing) or create workflow logger (for production)
    const effectiveLogger = logger || createWorkflowLogger('MobileNativeOrchestrator');
    super(server, 'MobileNativeOrchestrator', effectiveLogger);
    this.useMemoryForTesting = useMemoryForTesting;
  }

  /**
   * Handle orchestrator requests - manages workflow state and execution
   */
  protected async handleRequest(input: OrchestratorInput) {
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
  }

  private async processRequest(input: OrchestratorInput): Promise<OrchestratorOutput> {
    // Generate or use existing thread ID for workflow session
    const threadId = input.workflowStateData?.thread_id || generateUniqueThreadId();
    const workflowStateData: WorkflowStateData = { thread_id: threadId };

    this.logger.info('Processing orchestrator request', {
      threadId,
      hasUserInput: !!input.userInput,
      isResumption: !!input.workflowStateData?.thread_id,
    });

    // Thread configuration for LangGraph
    const threadConfig = { configurable: { thread_id: threadId } };

    // Initialize checkpointer for state persistence
    const checkpointer = createCheckpointer(this.useMemoryForTesting);

    // Compile workflow with checkpointer
    const compiledWorkflow = mobileNativeWorkflow.compile({ checkpointer });

    // Check for interrupted workflow state
    this.logger.debug('Checking for interrupted workflow state');
    const graphState = await compiledWorkflow.getState(threadConfig);
    const interruptedTask = graphState.tasks.find(task => task.interrupts.length > 0);

    let result: typeof MobileNativeWorkflowState.State;
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
          platform: this.extractPlatform(input.userInput),
        },
        threadConfig
      );
    }

    this.logger.debug('Processing workflow result');
    const interruptState: MCPToolInvocationData | undefined =
      '__interrupt__' in result
        ? (result.__interrupt__ as Array<{ value: MCPToolInvocationData }>)[0].value
        : undefined;

    if (!interruptState) {
      this.logger.error('Workflow completed without expected interrupt state');
      throw new Error('FATAL: Unexpected workflow state without an interrupt');
    }

    this.logger.info('Workflow execution completed', {
      isComplete: interruptState.isComplete,
      toolName: interruptState.llmMetadata?.name,
    });

    // Create orchestration prompt or completion message
    const orchestrationPrompt = interruptState.isComplete
      ? 'The workflow has completed successfully. Your Contact list mobile app is now ready!'
      : this.createOrchestrationPrompt(interruptState, workflowStateData);

    return {
      orchestrationInstructionsPrompt: orchestrationPrompt,
      isComplete: interruptState.isComplete,
    };
  }

  /**
   * Extract platform from user input (simple implementation for steel thread)
   */
  private extractPlatform(userInput: string): string {
    if (userInput.toLowerCase().includes('android')) {
      return 'Android';
    }
    return 'iOS'; // Default for proof of life
  }

  /**
   * Create orchestration prompt for LLM with embedded tool invocation data and workflow state
   */
  private createOrchestrationPrompt(
    interruptData: MCPToolInvocationData,
    workflowStateData: WorkflowStateData
  ): string {
    return `
# Your Role

You are participating in a workflow orchestration process. The current (\`sfmobile-native-project-manager\`) MCP server tool is the orchestrator, and is sending you instructions on what to do next. These instructions describe the next participating MCP server tool to invoke, along with its input schema and input values.

# Your Task

- Invoke the following MCP server tool:

**MCP Server Tool Name**: ${interruptData.llmMetadata?.name}
**MCP Server Tool Input Schema**:
\`\`\`json
${JSON.stringify(zodToJsonSchema(interruptData.llmMetadata?.inputSchema), null, 2)}
\`\`\`
**MCP Server Tool Input Values**:
\`\`\`json
${JSON.stringify(interruptData.input, null, 2)}
\`\`\`

## Additional Input: \`workflowStateData\`

\`workflowStateData\` is an additional input parameter that is specified in the input schema above, and should be passed to the next MCP server tool invocation, with the following object value:

\`\`\`json
${JSON.stringify(workflowStateData)}
\`\`\`

This represents opaque workflow state data that should be round-tripped back to the \`${this.toolId}\` MCP server tool orchestrator at the completion of the next MCP server tool invocation, without modification. These instructions will be further specified by the next MCP server tool invocation.

- The MCP server tool you invoke will respond with its output, along with further instructions for continuing the workflow.
    `.trim();
  }
}
