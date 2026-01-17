/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import z from 'zod';
import { executeToolWithLogging } from '../../src/utils/toolExecutionUtils.js';
import { MCPToolInvocationData } from '../../src/common/metadata.js';
import { MockToolExecutor } from '../utils/MockToolExecutor.js';
import { MockLogger } from '../utils/MockLogger.js';

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

describe('executeToolWithLogging', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
  });

  describe('Basic Execution with Default Validation', () => {
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

      const result = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        toolInvocationData,
        TestResultSchema
      );

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

      executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);

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

      executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const postExecutionLog = debugLogs.find(log =>
        log.message.includes('Tool execution result (post-execution)')
      );

      expect(postExecutionLog).toBeDefined();
      expect(postExecutionLog?.data).toHaveProperty('result');
      expect(postExecutionLog?.data).toMatchObject({ result: expectedResult });
    });

    it('should call tool executor with correct invocation data', () => {
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

      executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBe(toolInvocationData);
    });
  });

  describe('Schema Validation', () => {
    it('should log validated result when using default validation', () => {
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
      mockLogger.reset();

      executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const validatedLog = debugLogs.find(log => log.message.includes('Validated tool result'));

      expect(validatedLog).toBeDefined();
      expect(validatedLog?.data).toHaveProperty('validatedResult');
      expect(validatedLog?.data).toMatchObject({ validatedResult: expectedResult });
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
        executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);
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
        executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);
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

      const result = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        toolInvocationData,
        TestResultSchema
      );

      // Zod strips extra fields by default
      expect(result).toEqual({
        resultField: 'test',
        numberField: 42,
      });
      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('anotherExtra');
    });
  });

  describe('Custom Validator', () => {
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

      const result = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        toolInvocationData,
        TestResultSchema,
        customValidator
      );

      // Result should be transformed by custom validator
      expect(result.resultField).toBe('ORIGINAL');
      expect(result.numberField).toBe(20);
    });

    it('should not log validated result when using custom validator', () => {
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
        resultField: 'test',
        numberField: 10,
      };

      mockToolExecutor.setResult('test-tool', rawResult);
      mockLogger.reset();

      // Custom validator
      const customValidator = (
        result: unknown,
        schema: typeof TestResultSchema
      ): z.infer<typeof TestResultSchema> => {
        return schema.parse(result);
      };

      executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        toolInvocationData,
        TestResultSchema,
        customValidator
      );

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const validatedLog = debugLogs.find(log => log.message.includes('Validated tool result'));

      // Should NOT log validated result when custom validator is used
      expect(validatedLog).toBeUndefined();
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

      executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        toolInvocationData,
        TestResultSchema,
        customValidator
      );

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
        executeToolWithLogging(
          mockToolExecutor,
          mockLogger,
          toolInvocationData,
          TestResultSchema,
          customValidator
        );
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
        executeToolWithLogging(
          mockToolExecutor,
          mockLogger,
          toolInvocationData,
          TestResultSchema,
          customValidator
        );
      }).toThrow('Number must be positive');
    });
  });

  describe('Edge Cases', () => {
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
        executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);
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
        executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);
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
        executeToolWithLogging(mockToolExecutor, mockLogger, toolInvocationData, TestResultSchema);
      }).toThrow(z.ZodError);
    });
  });

  describe('Multiple Tool Calls', () => {
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

      const result1 = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        tool1InvocationData,
        TestResultSchema
      );
      const result2 = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        tool2InvocationData,
        TestResultSchema
      );

      expect(result1.resultField).toBe('result-1');
      expect(result1.numberField).toBe(1);
      expect(result2.resultField).toBe('result-2');
      expect(result2.numberField).toBe(2);

      // Verify both tools were called
      const callHistory = mockToolExecutor.getCallHistory();
      expect(callHistory).toHaveLength(2);
      expect(callHistory[0].llmMetadata.name).toBe('tool-1');
      expect(callHistory[1].llmMetadata.name).toBe('tool-2');
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

      const result1 = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        tool1InvocationData,
        TestResultSchema
      );
      const result2 = executeToolWithLogging(
        mockToolExecutor,
        mockLogger,
        tool2InvocationData,
        AlternateResultSchema
      );

      expect(result1).toEqual({ resultField: 'result-1', numberField: 1 });
      expect(result2).toEqual({ alternateField: true });
    });
  });
});
