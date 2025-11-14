/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiPRDUpdateTool } from '../../../../src/tools/prd/magi-prd-update/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiPRDUpdateTool', () => {
  let tool: MagiPRDUpdateTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiPRDUpdateTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-update');
      expect(tool.toolMetadata.title).toBe('Magi - Update PRD');
      expect(tool.toolMetadata.description).toBe(
        'Updates the PRD file based on review feedback. Applies modifications requested during the review process.'
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
    it('should accept valid input with prdFilePath and reviewResult', () => {
      const validInput = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Functional Requirements',
              modificationReason: 'User requested changes',
              requestedContent: 'Updated content',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with approved review result', () => {
      const validInput = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: true,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing prdFilePath', () => {
      const invalidInput = {
        reviewResult: {
          approved: false,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing reviewResult', () => {
      const invalidInput = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with updatedPrdContent', () => {
      const validResult = {
        updatedPrdContent: '# PRD\n\nUpdated content',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing updatedPrdContent', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('PRD Update Guidance Generation', () => {
    it('should generate guidance with PRD file path and review result', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Functional Requirements',
              modificationReason: 'User requested changes',
              requestedContent: 'Updated content',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('PRD update tool');
      expect(response.promptForLLM).toContain('/path/to/prd.md');
      expect(response.promptForLLM).toContain('Functional Requirements');
    });

    it('should include modification instructions when modifications are present', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated overview',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Modification Handling');
      expect(response.promptForLLM).toContain('Overview');
    });

    it('should handle review result without modifications', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('No modifications requested');
    });

    it('should include critical requirements', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications: [],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('CRITICAL REQUIREMENTS');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications: [],
        },
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
    it('should handle empty modifications array', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications: [],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle many modifications', async () => {
      const modifications = Array.from({ length: 10 }, (_, i) => ({
        section: `Section ${i + 1}`,
        modificationReason: `Reason ${i + 1}`,
        requestedContent: `Content ${i + 1}`,
      }));

      const input = {
        prdFilePath: '/path/to/prd.md',
        reviewResult: {
          approved: false,
          modifications,
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});

