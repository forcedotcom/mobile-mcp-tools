/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import z from 'zod';
import { PRDAbstractToolNode } from '../../../../../src/workflow/magi/prd/nodes/prdAbstractToolNode.js';
import { PRDState } from '../../../../../src/workflow/magi/prd/metadata.js';
import { MCPToolInvocationData } from '../../../../../src/common/metadata.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';

/**
 * Concrete test implementation of PRDAbstractToolNode
 */
class TestPRDAbstractToolNode extends PRDAbstractToolNode {
  public lastExecutedState?: PRDState;
  public lastToolInvocationData?: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>;
  public lastResultSchema?: z.ZodObject<z.ZodRawShape>;

  execute = (state: PRDState): Partial<PRDState> => {
    this.lastExecutedState = state;
    return {};
  };

  // Expose executeToolWithLogging for testing
  public executeToolPublic<TResultSchema extends z.ZodObject<z.ZodRawShape>>(
    toolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>,
    resultSchema: TResultSchema,
    validator?: (result: unknown, schema: TResultSchema) => z.infer<TResultSchema>
  ): z.infer<TResultSchema> {
    this.lastToolInvocationData = toolInvocationData;
    this.lastResultSchema = resultSchema;
    return this.executeToolWithLogging(toolInvocationData, resultSchema, validator);
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

describe('PRDAbstractToolNode', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let testNode: TestPRDAbstractToolNode;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    testNode = new TestPRDAbstractToolNode('testNode', mockToolExecutor, mockLogger);
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
      expect(testNode['componentName']).toBe('WorkflowNode:testNode');
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new TestPRDAbstractToolNode('testNode', mockToolExecutor);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });

    it('should create default tool executor when none provided', () => {
      const nodeWithoutExecutor = new TestPRDAbstractToolNode('testNode', undefined, mockLogger);
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
        log.message.includes('Tool invocation data (pre-execution)')
      );

      expect(preExecutionLog).toBeDefined();
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

      const invalidResult = {
        resultField: 'test',
        // numberField is missing
      };

      mockToolExecutor.setResult('test-tool', invalidResult);

      expect(() => {
        testNode.executeToolPublic(toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });
  });
});
