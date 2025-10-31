/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PRDFailureTool } from '../../../../../src/tools/magi/prd/magi-prd-failure/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('PRDFailureTool', () => {
  let tool: PRDFailureTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new PRDFailureTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-failure');
      expect(tool.toolMetadata.title).toBe('MAGI PRD Generation - Workflow Failure');
      expect(tool.toolMetadata.description).toBe(
        'Describes a failure of the PRD generation workflow to the user'
      );
      expect(tool.toolMetadata.inputSchema).toBeDefined();
      expect(tool.toolMetadata.outputSchema).toBeDefined();
      expect(tool.toolMetadata.resultSchema).toBeDefined();
    });

    it('should register without throwing errors', () => {
      expect(() => tool.register(annotations)).not.toThrow();
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with failure messages', () => {
      const validInput = {
        messages: ['Error 1', 'Error 2', 'Error 3'],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept single failure message', () => {
      const validInput = {
        messages: ['Single error message'],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty messages array', () => {
      const validInput = {
        messages: [],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing messages', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing workflowStateData', () => {
      const invalidInput = {
        messages: ['Error'],
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-array messages', () => {
      const invalidInput = {
        messages: 'not an array' as unknown as string[],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject messages with non-string elements', () => {
      const invalidInput = {
        messages: ['Error 1', 123, 'Error 2'] as unknown as string[],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate empty result object', () => {
      const validResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });

  describe('Failure Guidance Generation', () => {
    it('should generate guidance with failure messages', async () => {
      const input = {
        messages: ['Error 1', 'Error 2', 'Error 3'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('ROLE');
      expect(response.promptForLLM).toContain('TASK');
      expect(response.promptForLLM).toContain('failure');
      expect(response.promptForLLM).toContain('- Error 1');
      expect(response.promptForLLM).toContain('- Error 2');
      expect(response.promptForLLM).toContain('- Error 3');
    });

    it('should format failure messages as a list', async () => {
      const input = {
        messages: ['First error', 'Second error'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('- First error');
      expect(response.promptForLLM).toContain('- Second error');
    });

    it('should include non-recoverable note', async () => {
      const input = {
        messages: ['Error occurred'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('non-recoverable');
      expect(response.promptForLLM).toContain('You should not spend time trying to fix');
    });

    it('should handle empty messages array', async () => {
      const input = {
        messages: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toBeDefined();
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        messages: ['Error message'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Post-Tool-Invocation Instructions');
      expect(response.resultSchema).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', async () => {
      const longMessage = 'Error: ' + 'A'.repeat(1000);
      const input = {
        messages: [longMessage],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toContain(longMessage);
    });

    it('should handle many failure messages', async () => {
      const messages = Array.from({ length: 50 }, (_, i) => `Error ${i + 1}`);
      const input = {
        messages,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('- Error 1');
      expect(response.promptForLLM).toContain('- Error 50');
    });
  });
});
