/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import z from 'zod';
import { AbstractToolNode } from '../../src/nodes/abstractToolNode.js';
import { MockToolExecutor } from '../utils/MockToolExecutor.js';
import {
  MCPToolInvocationData,
  NodeGuidanceData,
  InterruptData,
  isNodeGuidanceData,
} from '../../src/common/metadata.js';
import { MockLogger } from '../utils/MockLogger.js';

// Simple test state type
type TestState = {
  count: number;
  message: string;
};

/**
 * Concrete test implementation of AbstractToolNode
 *
 * This implementation tests the parent class functionality provided by AbstractToolNode
 * in isolation, and as such has a nominal implementation of the node itself.
 */
class TestNode extends AbstractToolNode<TestState> {
  public lastExecutedState?: TestState;
  public lastInterruptData?: InterruptData<z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>>;
  public lastResultSchema?: z.ZodObject<z.ZodRawShape>;

  execute = (state: TestState): Partial<TestState> => {
    this.lastExecutedState = state;
    return {}; // We're testing internals. This value doesn't matter.
  };

  // Expose executeToolWithLogging for testing
  public executeToolPublic<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    interruptData: InterruptData<z.ZodObject<z.ZodRawShape>, TResultSchema>,
    resultSchema: TResultSchema,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    this.lastInterruptData = interruptData;
    this.lastResultSchema = resultSchema;
    return this.executeToolWithLogging(interruptData, resultSchema, validator);
  }
}

// Test schemas
const TestInputSchema = z.object({
  testField: z.string(),
  workflowStateData: z.object({
    thread_id: z.string(),
  }),
});

const TestResultSchema = z.object({
  resultField: z.string(),
  numberField: z.number(),
});

describe('AbstractToolNode', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let testNode: TestNode;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    testNode = new TestNode('testNode', mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with provided name', () => {
      expect(testNode.name).toBe('testNode');
    });

    it('should use provided tool executor', () => {
      expect(testNode['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(testNode['logger']).toBe(mockLogger);
    });

    it('should set component name correctly', () => {
      expect(testNode['componentName']).toBe('WorkflowNode:TestNode');
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new TestNode('testNode', mockToolExecutor);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });

    it('should create default tool executor when none provided', () => {
      const nodeWithoutExecutor = new TestNode('testNode', undefined, mockLogger);
      expect(nodeWithoutExecutor['toolExecutor']).toBeDefined();
      expect(nodeWithoutExecutor['toolExecutor']).not.toBe(mockToolExecutor);
    });
  });

  describe('executeToolWithLogging - Default Schema Validation', () => {
    it('should execute tool and validate result with schema', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      const expectedResult = {
        resultField: 'success',
        numberField: 42,
      };

      mockToolExecutor.setResult('test-tool', expectedResult);

      const result = testNode.executeToolPublic(toolInvocationData, TestResultSchema);

      expect(result).toEqual(expectedResult);
      expect(result.resultField).toBe('success');
      expect(result.numberField).toBe(42);
    });

    it('should log tool invocation data pre-execution', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      mockToolExecutor.setResult('test-tool', { resultField: 'test', numberField: 1 });
      mockLogger.reset();

      testNode.executeToolPublic(toolInvocationData, TestResultSchema);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const preExecutionLog = debugLogs.find(log =>
        log.message.includes('Interrupt data (pre-execution)')
      );

      expect(preExecutionLog).toBeDefined();
      expect(preExecutionLog?.data).toHaveProperty('interruptData');
    });

    it('should log tool execution result post-execution', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      const expectedResult = { resultField: 'test', numberField: 1 };
      mockToolExecutor.setResult('test-tool', expectedResult);
      mockLogger.reset();

      testNode.executeToolPublic(toolInvocationData, TestResultSchema);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const postExecutionLog = debugLogs.find(log =>
        log.message.includes('Tool execution result (post-execution)')
      );

      expect(postExecutionLog).toBeDefined();
      expect(postExecutionLog?.data).toHaveProperty('result');
      expect(postExecutionLog?.data).toMatchObject({ result: expectedResult });
    });

    it('should throw ZodError when result does not match schema', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      // Invalid result - missing required fields
      const invalidResult = {
        resultField: 'test',
        // numberField is missing
      };

      mockToolExecutor.setResult('test-tool', invalidResult);

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });

    it('should throw ZodError when result has wrong types', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      // Invalid result - wrong type for numberField
      const invalidResult = {
        resultField: 'test',
        numberField: 'not-a-number', // Should be number
      };

      mockToolExecutor.setResult('test-tool', invalidResult);

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });
  });

  describe('executeToolWithLogging - Custom Validator', () => {
    it('should use custom validator when provided', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      const rawResult = {
        resultField: 'original',
        numberField: 10,
      };

      mockToolExecutor.setResult('test-tool', rawResult);

      // Custom validator that transforms the result
      const customValidator = (
        result: unknown,
        schema: typeof TestResultSchema
      ): z.infer<typeof TestResultSchema> => {
        const parsed = schema.parse(result);
        // Transform the result
        return {
          ...parsed,
          resultField: parsed.resultField.toUpperCase(),
          numberField: parsed.numberField * 2,
        };
      };

      const result = testNode.executeToolPublic(
        toolInvocationData,
        TestResultSchema,
        customValidator
      );

      // Result should be transformed by custom validator
      expect(result.resultField).toBe('ORIGINAL');
      expect(result.numberField).toBe(20);
    });

    it('should pass schema to custom validator', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      mockToolExecutor.setResult('test-tool', { resultField: 'test', numberField: 1 });

      let capturedSchema: z.ZodObject<z.ZodRawShape> | undefined;

      const customValidator = (
        result: unknown,
        schema: typeof TestResultSchema
      ): z.infer<typeof TestResultSchema> => {
        capturedSchema = schema;
        return schema.parse(result);
      };

      testNode.executeToolPublic(toolInvocationData, TestResultSchema, customValidator);

      expect(capturedSchema).toBe(TestResultSchema);
    });

    it('should allow custom validator to throw custom errors', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      mockToolExecutor.setResult('test-tool', { resultField: 'test', numberField: 1 });

      const customValidator = (): z.infer<typeof TestResultSchema> => {
        throw new Error('Custom validation failed');
      };

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema, customValidator);
      }).toThrow('Custom validation failed');
    });

    it('should handle custom validator that performs additional checks', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      mockToolExecutor.setResult('test-tool', { resultField: 'test', numberField: -5 });

      // Custom validator that checks for positive numbers
      const customValidator = (
        result: unknown,
        schema: typeof TestResultSchema
      ): z.infer<typeof TestResultSchema> => {
        const parsed = schema.parse(result);
        if (parsed.numberField < 0) {
          throw new Error('Number must be positive');
        }
        return parsed;
      };

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema, customValidator);
      }).toThrow('Number must be positive');
    });
  });

  describe('executeToolWithLogging - Edge Cases', () => {
    it('should handle null result from tool executor', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      mockToolExecutor.setResult('test-tool', null);

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });

    it('should handle undefined result from tool executor', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      // Don't set a result, so it returns undefined
      mockToolExecutor.setResult('test-tool', undefined);

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });

    it('should handle empty object result', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      mockToolExecutor.setResult('test-tool', {});

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });

    it('should handle result with extra fields (schema should strip them)', () => {
      const toolInvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'test-value',
        },
      };

      const resultWithExtras = {
        resultField: 'test',
        numberField: 42,
        extraField: 'should-be-stripped',
        anotherExtra: 123,
      };

      mockToolExecutor.setResult('test-tool', resultWithExtras);

      const result = testNode.executeToolPublic(toolInvocationData, TestResultSchema);

      // Zod strips extra fields by default
      expect(result).toEqual({
        resultField: 'test',
        numberField: 42,
      });
      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('anotherExtra');
    });
  });

  describe('executeToolWithLogging - Multiple Tool Calls', () => {
    it('should support calling multiple tools in sequence', () => {
      const tool1InvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'tool-1',
          description: 'First tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'first',
        },
      };

      const tool2InvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'tool-2',
          description: 'Second tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'second',
        },
      };

      mockToolExecutor.setResult('tool-1', { resultField: 'result-1', numberField: 1 });
      mockToolExecutor.setResult('tool-2', { resultField: 'result-2', numberField: 2 });

      const result1 = testNode.executeToolPublic(tool1InvocationData, TestResultSchema);
      const result2 = testNode.executeToolPublic(tool2InvocationData, TestResultSchema);

      expect(result1.resultField).toBe('result-1');
      expect(result1.numberField).toBe(1);
      expect(result2.resultField).toBe('result-2');
      expect(result2.numberField).toBe(2);

      // Verify both tools were called with MCPToolInvocationData
      const callHistory = mockToolExecutor.getCallHistory();
      expect(callHistory).toHaveLength(2);
      // Both calls are MCPToolInvocationData, so use type guard to narrow
      const call0 = callHistory[0];
      const call1 = callHistory[1];
      if (!isNodeGuidanceData(call0) && !isNodeGuidanceData(call1)) {
        expect(call0.llmMetadata.name).toBe('tool-1');
        expect(call1.llmMetadata.name).toBe('tool-2');
      } else {
        expect.fail('Expected MCPToolInvocationData');
      }
    });

    it('should handle different result schemas for different tools', () => {
      const AlternateResultSchema = z.object({
        alternateField: z.boolean(),
      });

      const tool1InvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'tool-1',
          description: 'First tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'first',
        },
      };

      const tool2InvocationData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'tool-2',
          description: 'Second tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'second',
        },
      };

      mockToolExecutor.setResult('tool-1', { resultField: 'result-1', numberField: 1 });
      mockToolExecutor.setResult('tool-2', { alternateField: true });

      const result1 = testNode.executeToolPublic(tool1InvocationData, TestResultSchema);
      const result2 = testNode.executeToolPublic(tool2InvocationData, AlternateResultSchema);

      expect(result1).toEqual({ resultField: 'result-1', numberField: 1 });
      expect(result2).toEqual({ alternateField: true });
    });
  });

  describe('executeToolWithLogging - NodeGuidanceData Support', () => {
    it('should execute with NodeGuidanceData and validate result with schema', () => {
      const nodeGuidanceData: NodeGuidanceData<typeof TestResultSchema> = {
        nodeId: 'test-node',
        taskGuidance: 'Test guidance for the LLM',
        resultSchema: TestResultSchema,
      };

      const expectedResult = {
        resultField: 'success',
        numberField: 42,
      };

      mockToolExecutor.setResult('test-node', expectedResult);

      const result = testNode.executeToolPublic(nodeGuidanceData, TestResultSchema);

      expect(result).toEqual(expectedResult);
      expect(result.resultField).toBe('success');
      expect(result.numberField).toBe(42);
    });

    it('should log NodeGuidanceData pre-execution', () => {
      const nodeGuidanceData: NodeGuidanceData<typeof TestResultSchema> = {
        nodeId: 'test-node',
        taskGuidance: 'Test guidance',
        resultSchema: TestResultSchema,
      };

      mockToolExecutor.setResult('test-node', { resultField: 'test', numberField: 1 });
      mockLogger.reset();

      testNode.executeToolPublic(nodeGuidanceData, TestResultSchema);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const preExecutionLog = debugLogs.find(log =>
        log.message.includes('Interrupt data (pre-execution)')
      );

      expect(preExecutionLog).toBeDefined();
      expect(preExecutionLog?.data).toHaveProperty('interruptData');
    });

    it('should throw ZodError when NodeGuidanceData result does not match schema', () => {
      const nodeGuidanceData: NodeGuidanceData<typeof TestResultSchema> = {
        nodeId: 'test-node',
        taskGuidance: 'Test guidance',
        resultSchema: TestResultSchema,
      };

      // Invalid result - missing required fields
      mockToolExecutor.setResult('test-node', { resultField: 'test' });

      expect(() => {
        testNode.executeToolPublic(nodeGuidanceData, TestResultSchema);
      }).toThrow(z.ZodError);
    });

    it('should use custom validator with NodeGuidanceData', () => {
      const nodeGuidanceData: NodeGuidanceData<typeof TestResultSchema> = {
        nodeId: 'test-node',
        taskGuidance: 'Test guidance',
        resultSchema: TestResultSchema,
      };

      const rawResult = {
        resultField: 'original',
        numberField: 10,
      };

      mockToolExecutor.setResult('test-node', rawResult);

      // Custom validator that transforms the result
      const customValidator = (
        result: unknown,
        schema: typeof TestResultSchema
      ): z.infer<typeof TestResultSchema> => {
        const parsed = schema.parse(result);
        return {
          ...parsed,
          resultField: parsed.resultField.toUpperCase(),
          numberField: parsed.numberField * 2,
        };
      };

      const result = testNode.executeToolPublic(
        nodeGuidanceData,
        TestResultSchema,
        customValidator
      );

      expect(result.resultField).toBe('ORIGINAL');
      expect(result.numberField).toBe(20);
    });

    it('should handle NodeGuidanceData with exampleOutput', () => {
      const nodeGuidanceData: NodeGuidanceData<typeof TestResultSchema> = {
        nodeId: 'test-node',
        taskGuidance: 'Test guidance',
        resultSchema: TestResultSchema,
        exampleOutput: JSON.stringify({ resultField: 'example', numberField: 99 }),
      };

      const expectedResult = { resultField: 'actual', numberField: 50 };
      mockToolExecutor.setResult('test-node', expectedResult);

      const result = testNode.executeToolPublic(nodeGuidanceData, TestResultSchema);

      expect(result).toEqual(expectedResult);
    });

    it('should support mixing MCPToolInvocationData and NodeGuidanceData calls', () => {
      const mcpToolData: MCPToolInvocationData<typeof TestInputSchema> = {
        llmMetadata: {
          name: 'mcp-tool',
          description: 'An MCP tool',
          inputSchema: TestInputSchema,
        },
        input: {
          testField: 'mcp-value',
        },
      };

      const nodeGuidanceData: NodeGuidanceData<typeof TestResultSchema> = {
        nodeId: 'guidance-node',
        taskGuidance: 'Guidance for LLM',
        resultSchema: TestResultSchema,
      };

      mockToolExecutor.setResult('mcp-tool', { resultField: 'mcp-result', numberField: 1 });
      mockToolExecutor.setResult('guidance-node', {
        resultField: 'guidance-result',
        numberField: 2,
      });

      const result1 = testNode.executeToolPublic(mcpToolData, TestResultSchema);
      const result2 = testNode.executeToolPublic(nodeGuidanceData, TestResultSchema);

      expect(result1.resultField).toBe('mcp-result');
      expect(result2.resultField).toBe('guidance-result');

      // Verify both were called and have correct types
      const callHistory = mockToolExecutor.getCallHistory();
      expect(callHistory).toHaveLength(2);

      // First call should be MCPToolInvocationData
      const call0 = callHistory[0];
      if (!isNodeGuidanceData(call0)) {
        expect(call0.llmMetadata.name).toBe('mcp-tool');
      } else {
        expect.fail('Expected MCPToolInvocationData for first call');
      }

      // Second call should be NodeGuidanceData
      const call1 = callHistory[1];
      if (isNodeGuidanceData(call1)) {
        expect(call1.nodeId).toBe('guidance-node');
      } else {
        expect.fail('Expected NodeGuidanceData for second call');
      }
    });
  });
});
