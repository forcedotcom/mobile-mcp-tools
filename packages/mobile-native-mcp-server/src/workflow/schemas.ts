import { z } from 'zod';
import dedent from 'dedent';

/**
 * Workflow state data schema for round-tripping session identity
 * This lightweight object maintains workflow session continuity across stateless MCP tool invocations
 */
export const WORKFLOW_STATE_DATA_SCHEMA = z.object({
  thread_id: z.string().describe('Unique identifier for the workflow session'),
});
export type WorkflowStateData = z.infer<typeof WORKFLOW_STATE_DATA_SCHEMA>;

/**
 * Base input schema for workflow-aware tools
 * All tools participating in workflow orchestration should extend this schema
 */
export const WORKFLOW_TOOL_BASE_INPUT_SCHEMA = z.object({
  workflowStateData: WORKFLOW_STATE_DATA_SCHEMA.optional().describe(
    'Workflow session state for continuation (auto-generated if not provided)'
  ),
});

/**
 * Orchestrator input schema - simplified to single userInput parameter
 */
export const ORCHESTRATOR_INPUT_SCHEMA = z.object({
  userInput: z
    .string()
    .describe('User input (initial request or output from previously executed MCP tool)'),
  workflowStateData: WORKFLOW_STATE_DATA_SCHEMA.optional().describe(
    'Workflow session state for continuation (auto-generated if not provided)'
  ),
});
export type OrchestratorInput = z.infer<typeof ORCHESTRATOR_INPUT_SCHEMA>;

/**
 * Orchestrator output schema - natural language orchestration prompt with completion status
 */
export const ORCHESTRATOR_OUTPUT_SCHEMA = z.object({
  orchestrationInstructionsPrompt: z
    .string()
    .describe('The prompt describing the next workflow action for the LLM to execute.'),
  isComplete: z
    .boolean()
    .describe('True if the workflow has finished, false if the workflow has not finished.'),
});
export type OrchestratorOutput = z.infer<typeof ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * MCP tool invocation data structure used in LangGraph interrupts
 * Contains all information needed for the orchestrator to create tool invocation instructions
 *
 * Uses the centralized ToolMetadata interface but allows for lightweight inline metadata
 * for workflow completion notifications.
 */
export interface MCPToolInvocationData<T extends z.ZodRawShape = z.ZodRawShape> {
  /** Metadata about the tool to invoke - can be full ToolMetadata or minimal inline definition */
  llmMetadata: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<T>;
  };
  /** Input parameters for the tool invocation */
  input: Record<string, unknown>;
  /** Whether this represents workflow completion */
  isComplete: boolean;
}

/**
 * Standard output schema for all workflow MCP tools
 */
export const MCP_TOOL_OUTPUT_SCHEMA = z.object({
  promptForLLM: z
    .string()
    .describe('Complete prompt with instructions and post-processing guidance'),
});

/**
 * Post-invocation instructions template for workflow round-tripping
 * This template is used by all workflow tools to guide the LLM back to the orchestrator
 */
export const POST_INVOCATION_INSTRUCTIONS_TEMPLATE = dedent`
  # Post-Tool-Invocation Instructions

  After this prompt has been processed, you MUST initiate the following actions to proceed with the in-progress workflow:

  - Invoke the \`sfmobile-native-project-manager\` tool, with the following input schema:

  \`\`\`json
  {ORCHESTRATOR_INPUT_SCHEMA_JSON}
  \`\`\`

  - The value for the \`userInput\` parameter should be {toolOutputDescription}
  - The \`workflowStateData\` parameter should be passed with the following object value:

  \`\`\`json
  {WORKFLOW_STATE_DATA_JSON}
  \`\`\`

  This represents opaque workflow state data that should be round-tripped back to the \`sfmobile-native-project-manager\`
  MCP server tool orchestrator at the completion of the next MCP server tool invocation, without modification. These
  instructions will be further specified by the next MCP server tool invocation.

  - The MCP server tool you invoke will respond with its output, along with further instructions for continuing the workflow.
`;

/**
 * Note: Tool metadata and schemas are now centralized in '../registry/toolRegistry.js'
 * Import tool metadata directly from the registry for workflow integration.
 */
