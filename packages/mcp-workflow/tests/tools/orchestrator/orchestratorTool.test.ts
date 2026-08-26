/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Annotation, StateGraph, START, END, interrupt } from '@langchain/langgraph';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { z } from 'zod';
import { OrchestratorTool, OrchestratorConfig } from '../../../src/tools/orchestrator/index.js';
import { WorkflowStateManager } from '../../../src/checkpointing/workflowStateManager.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { MockFileSystem } from '../../utils/MockFileSystem.js';
import { MCPToolInvocationData, NodeGuidanceData } from '../../../src/common/metadata.js';
import { GET_INPUT_WORKFLOW_RESULT_SCHEMA } from '../../../src/tools/utilities/getInput/metadata.js';

/**
 * Creates a mock RequestHandlerExtra object for testing.
 * The extra parameter is required by the ToolCallback type signature.
 */
function createMockExtra(): RequestHandlerExtra<ServerRequest, ServerNotification> {
  return {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn().mockResolvedValue({}),
    _meta: {
      progressToken: 'test-progress-token',
    },
  } as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>;
}

// Create a simple test state for testing
const TestState = Annotation.Root({
  userInput: Annotation<unknown>,
  someBoolean: Annotation<boolean>,
});

type State = typeof TestState.State;

describe('OrchestratorTool', () => {
  let server: McpServer;
  let mockLogger: MockLogger;

  beforeEach(() => {
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0-test',
    });
    mockLogger = new MockLogger();
    mockLogger.reset(); // Reset global logs before each test
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const workflow = new StateGraph(TestState)
        .addNode('testNode', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'testNode')
        .addEdge('testNode', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test Description',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      expect(orchestrator.toolMetadata.toolId).toBe('test-orchestrator');
      expect(orchestrator.toolMetadata.title).toBe('Test Orchestrator');
      expect(orchestrator.toolMetadata.description).toBe('Test Description');
    });

    it('should default to production environment when context not provided', () => {
      const workflow = new StateGraph(TestState)
        .addNode('testNode', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'testNode')
        .addEdge('testNode', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test Description',
        workflow,
        logger: mockLogger,
      };

      // Should not throw - production mode is default
      const orchestrator = new OrchestratorTool(server, config);
      expect(orchestrator).toBeDefined();
    });

    it('should accept test environment context', () => {
      const workflow = new StateGraph(TestState)
        .addNode('testNode', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'testNode')
        .addEdge('testNode', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test Description',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('handleRequest', () => {
    it('should start new workflow when no thread_id provided', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('start', (_state: State) => ({
          messages: ['Started workflow'],
        }))
        .addEdge(START, 'start')
        .addEdge('start', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test orchestrator for new workflow',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: { test: 'data' },
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      // Verify logging occurred
      const infoLogs = mockLogger.getLogsByLevel('info');
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(mockLogger.hasLoggedMessage('Starting new workflow execution', 'info')).toBe(true);
    });

    it('should generate unique thread IDs with mmw prefix', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('start', (_state: State) => ({
          messages: ['Started'],
        }))
        .addEdge(START, 'start')
        .addEdge('start', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test',
        description: 'Test',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      // Make two requests without thread IDs
      await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );
      await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      // Check that thread IDs were logged and start with 'mmw-'
      const processingLogs = mockLogger.logs.filter(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLogs.length).toBe(2);

      // Both should have thread IDs starting with 'mmw-'
      processingLogs.forEach(log => {
        const threadId = (log.data as { threadId?: string })?.threadId;
        expect(threadId).toBeDefined();
        expect(threadId?.startsWith('mmw-')).toBe(true);
      });
    });

    it('should complete workflow and return completion message', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('complete', (_state: State) => ({
          messages: ['Completed'],
        }))
        .addEdge(START, 'complete')
        .addEdge('complete', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test',
        description: 'Test',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result.structuredContent).toBeDefined();
      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output.orchestrationInstructionsPrompt).toContain('workflow has concluded');
    });

    it('should handle workflow errors gracefully', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('error', () => {
          throw new Error('Test error in node');
        })
        .addEdge(START, 'error')
        .addEdge('error', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test',
        description: 'Test',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      await expect(
        orchestrator.handleRequest(
          {
            userInput: {},
            workflowStateData: { thread_id: '' },
          },
          createMockExtra()
        )
      ).rejects.toThrow();

      // Verify error was logged
      const errorLogs = mockLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
    });

    it('should parse and reuse existing thread_id', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('node', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'node')
        .addEdge('node', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test',
        description: 'Test',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const existingThreadId = 'mmw-12345-abc123';
      await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: existingThreadId },
        },
        createMockExtra()
      );

      // Find the processing log and verify it used the existing thread ID
      const processingLog = mockLogger.logs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      const threadId = (processingLog?.data as { threadId?: string })?.threadId;
      expect(threadId).toBe(existingThreadId);
    });
  });

  describe('tool registration', () => {
    it('should register tool with correct metadata', () => {
      const workflow = new StateGraph(TestState)
        .addNode('node', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'node')
        .addEdge('node', END);

      const config: OrchestratorConfig = {
        toolId: 'registration-test',
        title: 'Registration Test',
        description: 'Tests tool registration',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);
      orchestrator.register({ readOnlyHint: false });

      // Verify registration was logged
      expect(mockLogger.hasLoggedMessage('Registering MCP tool', 'info')).toBe(true);
    });
  });

  describe('checkpointing - test vs production mode', () => {
    it('should use MemorySaver in test mode', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('node', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'node')
        .addEdge('node', END);

      const config: OrchestratorConfig = {
        toolId: 'test-mode-orchestrator',
        title: 'Test Mode',
        description: 'Uses test environment',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      // Should execute without attempting file I/O
      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result).toBeDefined();

      // Should not log anything about importing/persisting state (MemorySaver doesn't use files)
      const hasStateLog = mockLogger.hasLoggedMessage('checkpointer state');
      expect(hasStateLog).toBe(false);
    });
  });

  describe('dynamic tool ID in prompts', () => {
    it('should use configured toolId in orchestration prompts', () => {
      const customToolId = 'my-custom-orchestrator-id';

      const workflow = new StateGraph(TestState)
        .addNode('node', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'node')
        .addEdge('node', END);

      const config: OrchestratorConfig = {
        toolId: customToolId,
        title: 'Custom Tool ID Test',
        description: 'Tests dynamic tool ID',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      // Verify toolId is used in metadata
      expect(orchestrator.toolMetadata.toolId).toBe(customToolId);
    });
  });

  describe('workflow interrupts and MCP tool invocation', () => {
    it('should handle workflow interrupts and return orchestration prompt', async () => {
      // Create a workflow that interrupts to invoke an MCP tool
      const workflow = new StateGraph(TestState)
        .addNode('interruptNode', (_state: State) => {
          // Simulate an interrupt for MCP tool invocation (delegate mode)
          const mcpToolData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> = {
            llmMetadata: {
              name: 'test-mcp-tool',
              description: 'Test MCP Tool',
              inputSchema: z.object({
                testParam: z.string(),
                workflowStateData: z.object({ thread_id: z.string() }),
              }),
            },
            input: {
              testParam: 'test-value',
            },
          };
          return interrupt(mcpToolData);
        })
        .addEdge(START, 'interruptNode')
        .addEdge('interruptNode', END);

      const config: OrchestratorConfig = {
        toolId: 'test-interrupt-orchestrator',
        title: 'Test Interrupt',
        description: 'Tests workflow interrupts',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result.structuredContent).toBeDefined();
      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output.orchestrationInstructionsPrompt).toContain('test-mcp-tool');
      expect(output.orchestrationInstructionsPrompt).toContain('# Your Role');
      expect(output.orchestrationInstructionsPrompt).toContain('# Your Task');
      expect(output.orchestrationInstructionsPrompt).toContain('test-interrupt-orchestrator');
      expect(output.orchestrationInstructionsPrompt).toContain('workflowStateData');
    });

    it('should include dynamic toolId in orchestration prompts', async () => {
      const customToolId = 'my-dynamic-orchestrator-123';

      const workflow = new StateGraph(TestState)
        .addNode('interruptNode', (_state: State) => {
          const mcpToolData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> = {
            llmMetadata: {
              name: 'dynamic-test-tool',
              description: 'Test',
              inputSchema: z.object({
                workflowStateData: z.object({ thread_id: z.string() }),
              }),
            },
            input: {},
          };
          return interrupt(mcpToolData);
        })
        .addEdge(START, 'interruptNode')
        .addEdge('interruptNode', END);

      const config: OrchestratorConfig = {
        toolId: customToolId,
        title: 'Dynamic Tool ID',
        description: 'Test',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      // Should reference the custom tool ID in the prompt
      expect(output.orchestrationInstructionsPrompt).toContain(customToolId);
    });

    it('should generate direct guidance prompt when NodeGuidanceData is used', async () => {
      const orchestratorToolId = 'test-direct-guidance-orchestrator';

      const workflow = new StateGraph(TestState)
        .addNode('getUserInput', (_state: State) => {
          // Create NodeGuidanceData for direct guidance mode
          const nodeGuidanceData: NodeGuidanceData<typeof GET_INPUT_WORKFLOW_RESULT_SCHEMA> = {
            nodeId: 'test-get-input',
            taskGuidance: `
# ROLE
You are an input gathering tool.

# TASK
Gather user input for platform and projectName.

# INSTRUCTIONS
1. Ask the user for platform
2. Ask the user for projectName
3. **IMPORTANT:** YOU MUST NOW WAIT for the user to provide input.
`,
            resultSchema: GET_INPUT_WORKFLOW_RESULT_SCHEMA,
          };
          return interrupt(nodeGuidanceData);
        })
        .addEdge(START, 'getUserInput')
        .addEdge('getUserInput', END);

      const config: OrchestratorConfig = {
        toolId: orchestratorToolId,
        title: 'Direct Guidance Test',
        description: 'Tests direct guidance mode with NodeGuidanceData',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result.structuredContent).toBeDefined();
      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      const prompt = output.orchestrationInstructionsPrompt;

      // Should contain direct guidance prompt structure
      expect(prompt).toContain('# ROLE');
      expect(prompt).toContain('# TASK GUIDANCE');

      // Should contain the taskGuidance content
      expect(prompt).toContain('input gathering tool');
      expect(prompt).toContain('YOU MUST NOW WAIT for the user');

      // Input data is embedded directly in taskGuidance (no separate INPUT SCHEMA/DATA sections)
      // The taskGuidance already contains all necessary context

      // Should contain critical next step instructions
      expect(prompt).toContain('# CRITICAL: REQUIRED NEXT STEP');
      expect(prompt).toContain(orchestratorToolId);
      expect(prompt).toContain('workflowStateData');

      // Should contain output format section
      expect(prompt).toContain('# OUTPUT FORMAT');
      expect(prompt).toContain('MUST be a JSON object conforming to this schema');
      expect(prompt).toContain('userUtterance');

      // Should contain example tool call section
      expect(prompt).toContain('# EXAMPLE TOOL CALL');

      // Should NOT contain delegate mode content
      expect(prompt).not.toContain('Invoke the following MCP server tool');
    });

    it('should use custom returnGuidance when provided in NodeGuidanceData', async () => {
      const orchestratorToolId = 'test-return-guidance-orchestrator';
      const customReturnMarker = '## CUSTOM RETURN GUIDANCE MARKER';

      const workflow = new StateGraph(TestState)
        .addNode('guidedNode', (_state: State) => {
          const nodeGuidanceData: NodeGuidanceData<typeof GET_INPUT_WORKFLOW_RESULT_SCHEMA> = {
            nodeId: 'test-custom-return',
            taskGuidance: 'Do something interesting.',
            resultSchema: GET_INPUT_WORKFLOW_RESULT_SCHEMA,
            exampleOutput: '{ "userUtterance": "example" }',
            returnGuidance: workflowStateData =>
              `${customReturnMarker}\nReturn to orchestrator with thread: ${workflowStateData.thread_id}`,
          };
          return interrupt(nodeGuidanceData);
        })
        .addEdge(START, 'guidedNode')
        .addEdge('guidedNode', END);

      const config: OrchestratorConfig = {
        toolId: orchestratorToolId,
        title: 'Return Guidance Test',
        description: 'Tests custom returnGuidance in NodeGuidanceData',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result.structuredContent).toBeDefined();
      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      const prompt = output.orchestrationInstructionsPrompt;

      // Should contain the custom return guidance
      expect(prompt).toContain(customReturnMarker);
      expect(prompt).toContain('Return to orchestrator with thread: mmw-');

      // Should still contain the task guidance structure
      expect(prompt).toContain('# TASK GUIDANCE');
      expect(prompt).toContain('Do something interesting.');

      // Should NOT contain the default return guidance sections
      expect(prompt).not.toContain('# CRITICAL: REQUIRED NEXT STEP');
      expect(prompt).not.toContain('# OUTPUT FORMAT');
      expect(prompt).not.toContain('# EXAMPLE TOOL CALL');
    });

    it('should use delegate mode (orchestration prompt) when MCPToolInvocationData is used', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('regularInterrupt', (_state: State) => {
          // Create MCPToolInvocationData for delegate mode
          const mcpToolData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> = {
            llmMetadata: {
              name: 'regular-tool',
              description: 'A regular MCP tool',
              inputSchema: z.object({
                someParam: z.string(),
                workflowStateData: z.object({ thread_id: z.string() }),
              }),
            },
            input: {
              someParam: 'value',
            },
          };
          return interrupt(mcpToolData);
        })
        .addEdge(START, 'regularInterrupt')
        .addEdge('regularInterrupt', END);

      const config: OrchestratorConfig = {
        toolId: 'test-regular-orchestrator',
        title: 'Regular Orchestrator',
        description: 'Tests delegate mode orchestration prompt',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result.structuredContent).toBeDefined();
      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      const prompt = output.orchestrationInstructionsPrompt;

      // Should contain delegate mode (orchestration) prompt content
      expect(prompt).toContain('# Your Role');
      expect(prompt).toContain('# Your Task');
      expect(prompt).toContain('Invoke the following MCP server tool');
      expect(prompt).toContain('regular-tool');

      // Should NOT contain direct guidance mode content
      expect(prompt).not.toContain('# TASK GUIDANCE');
      expect(prompt).not.toContain('# POST-TASK INSTRUCTIONS');
    });

    it('should resume interrupted workflow with user input (full interrupt->resume cycle)', async () => {
      // Use MockFileSystem for state persistence across calls
      const mockFs = new MockFileSystem();
      const testProjectPath = '/test/project';

      // Create a workflow that always interrupts on first run, then processes resume input
      const workflow = new StateGraph(TestState)
        .addNode('requestData', (_state: State) => {
          // Always interrupt to request MCP tool invocation (delegate mode)
          const mcpToolData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> = {
            llmMetadata: {
              name: 'get-user-data',
              description: 'Get user data',
              inputSchema: z.object({
                query: z.string(),
                workflowStateData: z.object({ thread_id: z.string() }),
              }),
            },
            input: {
              query: 'What is your name?',
            },
          };
          return interrupt(mcpToolData);
        })
        .addNode('processData', (state: State) => {
          // Process the userInput that came from resumption
          return {
            userInput: state.userInput,
            someBoolean: true,
          };
        })
        .addEdge(START, 'requestData')
        .addEdge('requestData', 'processData')
        .addEdge('processData', END);

      // Use production mode with mock filesystem to enable state persistence
      const stateManager = new WorkflowStateManager({
        environment: 'production',
        projectPath: testProjectPath,
        fileSystemOperations: mockFs,
      });

      const config: OrchestratorConfig = {
        toolId: 'test-resume-orchestrator',
        title: 'Test Resume',
        description: 'Tests workflow resumption after interrupt',
        workflow,
        stateManager,
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      // STEP 1: Start workflow - should hit interrupt
      const result1 = await orchestrator.handleRequest(
        {
          userInput: {},
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result1.structuredContent).toBeDefined();
      const output1 = result1.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output1.orchestrationInstructionsPrompt).toContain('get-user-data');

      // Extract thread_id from the prompt (it's embedded in the orchestration instructions)
      const threadIdMatch = output1.orchestrationInstructionsPrompt.match(
        /"thread_id":\s*"(mmw-[^"]+)"/
      );
      expect(threadIdMatch).not.toBeNull();
      const threadId = threadIdMatch![1];

      // Verify resuming log was NOT present (this was the initial start)
      expect(mockLogger.hasLoggedMessage('Resuming interrupted workflow', 'info')).toBe(false);

      // Reset mock logger to clear previous logs before resumption
      mockLogger.reset();

      // STEP 2: Resume workflow with user input from "tool execution"
      const result2 = await orchestrator.handleRequest(
        {
          userInput: { userName: 'John Doe' },
          workflowStateData: { thread_id: threadId },
        },
        createMockExtra()
      );

      // Should complete successfully
      expect(result2).toBeDefined();

      // Verify resuming log IS present now (after reset, so it's from this call)
      const hasResumingLog = mockLogger.hasLoggedMessage('Resuming interrupted workflow', 'info');
      expect(hasResumingLog).toBe(true);

      // Verify completion message
      const output2 = result2.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output2.orchestrationInstructionsPrompt).toContain('The workflow has concluded');
    });
  });

  describe('different workflow state structures', () => {
    it('should work with custom state structures', async () => {
      // Define a different state structure with custom reducers
      const CustomState = Annotation.Root({
        count: Annotation<number>,
        name: Annotation<string>,
      });

      type CustomStateType = typeof CustomState.State;

      const workflow = new StateGraph(CustomState)
        .addNode('increment', (_state: CustomStateType) => ({
          count: 1,
        }))
        .addEdge(START, 'increment')
        .addEdge('increment', END);

      const config: OrchestratorConfig = {
        toolId: 'custom-state-orchestrator',
        title: 'Custom State',
        description: 'Uses custom state structure',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      const result = await orchestrator.handleRequest(
        {
          userInput: { name: 'test' },
          workflowStateData: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid input gracefully and start new workflow', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('start', (_state: State) => ({
          messages: ['Started workflow'],
        }))
        .addEdge(START, 'start')
        .addEdge('start', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test orchestrator for error handling',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      // Send input that violates schema - userInput should be Record<string, unknown>, not a string
      const result = await orchestrator.handleRequest(
        {
          // @ts-expect-error: We are intentionally sending a string instead of an object
          userInput: 'this should be an object, not a string',
          workflowStateData: { thread_id: 'test-thread' },
        },
        createMockExtra()
      );

      // Should still return a valid result (starts new workflow with generated thread ID)
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Verify error was logged
      const errorLogs = mockLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(mockLogger.hasLoggedMessage('Error parsing orchestrator input', 'error')).toBe(true);

      // Verify it started a new workflow despite the parse error
      expect(mockLogger.hasLoggedMessage('Starting new workflow execution', 'info')).toBe(true);
    });

    it('should handle malformed workflowStateData gracefully', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('start', (_state: State) => ({
          messages: ['Started workflow'],
        }))
        .addEdge(START, 'start')
        .addEdge('start', END);

      const config: OrchestratorConfig = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test orchestrator for malformed data',
        workflow,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OrchestratorTool(server, config);

      // Send input with malformed workflowStateData (should be object, not string)
      const result = await orchestrator.handleRequest(
        {
          userInput: { test: 'data' },
          // @ts-expect-error: We are intentionally sending a string instead of an object
          workflowStateData: 'this is not an object',
        },
        createMockExtra()
      );

      // Should still return a valid result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Verify error was logged and new workflow started
      expect(mockLogger.hasLoggedMessage('Error parsing orchestrator input', 'error')).toBe(true);
      expect(mockLogger.hasLoggedMessage('Starting new workflow execution', 'info')).toBe(true);
    });
  });

  describe('custom input schema', () => {
    // Define a custom input schema with different property names
    const CUSTOM_INPUT_SCHEMA = z.object({
      payload: z.unknown().optional(),
      sessionState: z
        .object({
          thread_id: z.string(),
        })
        .default({ thread_id: '' }),
    });

    type CustomInput = z.infer<typeof CUSTOM_INPUT_SCHEMA>;

    /**
     * Custom orchestrator subclass that uses a different input schema.
     * Overrides the extractor methods to map custom property names to
     * the semantic values the orchestrator needs.
     */
    class CustomSchemaOrchestrator extends OrchestratorTool<typeof CUSTOM_INPUT_SCHEMA> {
      constructor(server: McpServer, config: OrchestratorConfig<typeof CUSTOM_INPUT_SCHEMA>) {
        super(server, config);
      }

      protected extractUserInput(input: CustomInput): unknown | undefined {
        return input.payload;
      }

      protected extractWorkflowStateData(input: CustomInput): { thread_id: string } | undefined {
        return input.sessionState;
      }
    }

    it('should accept custom input schema via config', () => {
      const workflow = new StateGraph(TestState)
        .addNode('testNode', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'testNode')
        .addEdge('testNode', END);

      const config: OrchestratorConfig<typeof CUSTOM_INPUT_SCHEMA> = {
        toolId: 'custom-schema-orchestrator',
        title: 'Custom Schema Orchestrator',
        description: 'Tests custom input schema',
        workflow,
        inputSchema: CUSTOM_INPUT_SCHEMA,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new CustomSchemaOrchestrator(server, config);

      expect(orchestrator.toolMetadata.toolId).toBe('custom-schema-orchestrator');
      // The input schema should be the custom one, not the default
      expect(orchestrator.toolMetadata.inputSchema).toBe(CUSTOM_INPUT_SCHEMA);
    });

    it('should start and complete workflow with custom schema properties', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('start', (_state: State) => ({
          messages: ['Started workflow'],
        }))
        .addEdge(START, 'start')
        .addEdge('start', END);

      const config: OrchestratorConfig<typeof CUSTOM_INPUT_SCHEMA> = {
        toolId: 'custom-schema-orchestrator',
        title: 'Custom Schema Orchestrator',
        description: 'Tests custom schema workflow execution',
        workflow,
        inputSchema: CUSTOM_INPUT_SCHEMA,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new CustomSchemaOrchestrator(server, config);

      const result = await orchestrator.handleRequest(
        {
          payload: { test: 'data' },
          sessionState: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      // Verify workflow completed
      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output.orchestrationInstructionsPrompt).toContain('workflow has concluded');
    });

    it('should reuse existing thread_id from custom schema properties', async () => {
      const workflow = new StateGraph(TestState)
        .addNode('node', (_state: State) => ({
          messages: ['test'],
        }))
        .addEdge(START, 'node')
        .addEdge('node', END);

      const config: OrchestratorConfig<typeof CUSTOM_INPUT_SCHEMA> = {
        toolId: 'custom-schema-orchestrator',
        title: 'Custom Schema Orchestrator',
        description: 'Tests thread ID extraction from custom schema',
        workflow,
        inputSchema: CUSTOM_INPUT_SCHEMA,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new CustomSchemaOrchestrator(server, config);

      const existingThreadId = 'mmw-12345-abc123';
      await orchestrator.handleRequest(
        {
          payload: {},
          sessionState: { thread_id: existingThreadId },
        },
        createMockExtra()
      );

      // Find the processing log and verify it used the existing thread ID
      const processingLog = mockLogger.logs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      const threadId = (processingLog?.data as { threadId?: string })?.threadId;
      expect(threadId).toBe(existingThreadId);
    });

    it('should generate a new thread when extractWorkflowStateData returns undefined', async () => {
      // Define a schema where sessionState is truly optional (no .default())
      const OPTIONAL_STATE_SCHEMA = z.object({
        payload: z.unknown().optional(),
        sessionState: z
          .object({
            thread_id: z.string(),
          })
          .optional(),
      });

      type OptionalStateInput = z.infer<typeof OPTIONAL_STATE_SCHEMA>;

      class OptionalStateOrchestrator extends OrchestratorTool<typeof OPTIONAL_STATE_SCHEMA> {
        constructor(
          mcpServer: McpServer,
          config: OrchestratorConfig<typeof OPTIONAL_STATE_SCHEMA>
        ) {
          super(mcpServer, config);
        }

        protected extractUserInput(input: OptionalStateInput): unknown | undefined {
          return input.payload;
        }

        protected extractWorkflowStateData(
          input: OptionalStateInput
        ): { thread_id: string } | undefined {
          return input.sessionState;
        }
      }

      const workflow = new StateGraph(TestState)
        .addNode('start', (_state: State) => ({
          messages: ['Started workflow'],
        }))
        .addEdge(START, 'start')
        .addEdge('start', END);

      const config: OrchestratorConfig<typeof OPTIONAL_STATE_SCHEMA> = {
        toolId: 'optional-state-orchestrator',
        title: 'Optional State Orchestrator',
        description: 'Tests undefined extractWorkflowStateData',
        workflow,
        inputSchema: OPTIONAL_STATE_SCHEMA,
        stateManager: new WorkflowStateManager({ environment: 'test' }),
        logger: mockLogger,
      };

      const orchestrator = new OptionalStateOrchestrator(server, config);

      // Omit sessionState entirely — extractWorkflowStateData should return undefined
      const result = await orchestrator.handleRequest(
        { payload: { test: 'data' } },
        createMockExtra()
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Should have started a new workflow (not a resumption)
      expect(mockLogger.hasLoggedMessage('Starting new workflow execution', 'info')).toBe(true);

      // The generated thread ID should follow the mmw- prefix convention
      const processingLog = mockLogger.logs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      const threadId = (processingLog?.data as { threadId?: string })?.threadId;
      expect(threadId).toBeDefined();
      expect(threadId).toMatch(/^mmw-/);
    });

    it('should handle interrupt/resume cycle with custom schema', async () => {
      const mockFs = new MockFileSystem();
      const testProjectPath = '/test/project';

      const workflow = new StateGraph(TestState)
        .addNode('requestData', (_state: State) => {
          const mcpToolData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> = {
            llmMetadata: {
              name: 'custom-schema-tool',
              description: 'Test tool for custom schema',
              inputSchema: z.object({
                query: z.string(),
                workflowStateData: z.object({ thread_id: z.string() }),
              }),
            },
            input: {
              query: 'What is your name?',
            },
          };
          return interrupt(mcpToolData);
        })
        .addNode('processData', (state: State) => {
          return {
            userInput: state.userInput,
            someBoolean: true,
          };
        })
        .addEdge(START, 'requestData')
        .addEdge('requestData', 'processData')
        .addEdge('processData', END);

      const stateManager = new WorkflowStateManager({
        environment: 'production',
        projectPath: testProjectPath,
        fileSystemOperations: mockFs,
      });

      const config: OrchestratorConfig<typeof CUSTOM_INPUT_SCHEMA> = {
        toolId: 'custom-schema-resume-orchestrator',
        title: 'Custom Schema Resume Test',
        description: 'Tests interrupt/resume with custom schema',
        workflow,
        inputSchema: CUSTOM_INPUT_SCHEMA,
        stateManager,
        logger: mockLogger,
      };

      const orchestrator = new CustomSchemaOrchestrator(server, config);

      // STEP 1: Start workflow - should hit interrupt
      const result1 = await orchestrator.handleRequest(
        {
          payload: {},
          sessionState: { thread_id: '' },
        },
        createMockExtra()
      );

      expect(result1.structuredContent).toBeDefined();
      const output1 = result1.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output1.orchestrationInstructionsPrompt).toContain('custom-schema-tool');

      // Extract thread_id from the prompt
      const threadIdMatch = output1.orchestrationInstructionsPrompt.match(
        /"thread_id":\s*"(mmw-[^"]+)"/
      );
      expect(threadIdMatch).not.toBeNull();
      const threadId = threadIdMatch![1];

      mockLogger.reset();

      // STEP 2: Resume workflow with user input via custom schema properties
      const result2 = await orchestrator.handleRequest(
        {
          payload: { userName: 'John Doe' },
          sessionState: { thread_id: threadId },
        },
        createMockExtra()
      );

      // Should complete successfully
      expect(result2).toBeDefined();
      expect(mockLogger.hasLoggedMessage('Resuming interrupted workflow', 'info')).toBe(true);

      const output2 = result2.structuredContent as { orchestrationInstructionsPrompt: string };
      expect(output2.orchestrationInstructionsPrompt).toContain('The workflow has concluded');
    });
  });
});
