/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiPRDFinalizationTool } from '../../../../src/tools/prd/magi-prd-finalization/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiPRDFinalizationTool', () => {
  let tool: MagiPRDFinalizationTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiPRDFinalizationTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-finalization');
      expect(tool.toolMetadata.title).toBe('Magi - Finalize PRD');
      expect(tool.toolMetadata.description).toBe(
        'Finalizes the PRD by updating the status to "finalized" after user approval. Takes the path to the PRD file and returns the updated content.'
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
    it('should accept valid input with prdFilePath', () => {
      const validInput = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing prdFilePath', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with finalizedPrdContent', () => {
      const validResult = {
        finalizedPrdContent: '# PRD\n\n## Status\n**Status**: finalized\n\nContent',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing finalizedPrdContent', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('PRD Finalization Guidance Generation', () => {
    it('should generate guidance with PRD file path', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('finalizing a PRD');
      expect(response.promptForLLM).toContain('/path/to/prd.md');
      expect(response.promptForLLM).toContain('File Path');
    });

    it('should include finalization process instructions', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Finalization Process');
      expect(response.promptForLLM).toContain('finalized');
      expect(response.promptForLLM).toContain('Status section');
    });

    it('should include critical requirements', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('CRITICAL REQUIREMENTS');
      expect(response.promptForLLM).toContain('ABSOLUTELY FORBIDDEN');
      expect(response.promptForLLM).toContain('Preserve all formatting');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
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
    it('should handle empty PRD file path', async () => {
      const input = {
        prdFilePath: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle long PRD file path', async () => {
      const longPath = '/path/to/' + 'nested/'.repeat(50) + 'prd.md';
      const input = {
        prdFilePath: longPath,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
