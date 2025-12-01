/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Annotation, StateGraph, START, END, interrupt } from '@langchain/langgraph';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OrchestratorTool, OrchestratorConfig } from '../../../src/tools/orchestrator/index.js';
import { WorkflowStateManager } from '../../../src/checkpointing/workflowStateManager.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { MockFileSystem } from '../../utils/MockFileSystem.js';
import { MCPToolInvocationData } from '../../../src/common/metadata.js';

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

      const result = await orchestrator.handleRequest({
        userInput: { test: 'data' },
        workflowStateData: { thread_id: '' },
      });

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
      await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });
      await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });

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

      const result = await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });

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
        orchestrator.handleRequest({
          userInput: {},
          workflowStateData: { thread_id: '' },
        })
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
      await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: existingThreadId },
      });

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
      const result = await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });

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
          // Simulate an interrupt for MCP tool invocation
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

      const result = await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });

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

      const result = await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });

      const output = result.structuredContent as { orchestrationInstructionsPrompt: string };
      // Should reference the custom tool ID in the prompt
      expect(output.orchestrationInstructionsPrompt).toContain(customToolId);
    });

    it('should resume interrupted workflow with user input (full interrupt->resume cycle)', async () => {
      // Use MockFileSystem for state persistence across calls
      const mockFs = new MockFileSystem();
      const testProjectPath = '/test/project';

      // Create a workflow that always interrupts on first run, then processes resume input
      const workflow = new StateGraph(TestState)
        .addNode('requestData', (_state: State) => {
          // Always interrupt to request MCP tool invocation
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
      const result1 = await orchestrator.handleRequest({
        userInput: {},
        workflowStateData: { thread_id: '' },
      });

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
      const result2 = await orchestrator.handleRequest({
        userInput: { userName: 'John Doe' },
        workflowStateData: { thread_id: threadId },
      });

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

      const result = await orchestrator.handleRequest({
        userInput: { name: 'test' },
        workflowStateData: { thread_id: '' },
      });

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
      const result = await orchestrator.handleRequest({
        // @ts-expect-error: We are intentionally sending a string instead of an object
        userInput: 'this should be an object, not a string',
        workflowStateData: { thread_id: 'test-thread' },
      });

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
      const result = await orchestrator.handleRequest({
        userInput: { test: 'data' },
        // @ts-expect-error: We are intentionally sending a string instead of an object
        workflowStateData: 'this is not an object',
      });

      // Should still return a valid result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Verify error was logged and new workflow started
      expect(mockLogger.hasLoggedMessage('Error parsing orchestrator input', 'error')).toBe(true);
      expect(mockLogger.hasLoggedMessage('Starting new workflow execution', 'info')).toBe(true);
    });
  });
});
