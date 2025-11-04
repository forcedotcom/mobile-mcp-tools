/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiPRDReviewTool } from '../../../../../src/tools/magi/prd/magi-prd-review/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiPRDReviewTool', () => {
  let tool: MagiPRDReviewTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiPRDReviewTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-review');
      expect(tool.toolMetadata.title).toBe('Magi - PRD Review');
      expect(tool.toolMetadata.description).toBe(
        'Presents the generated PRD to the user for review, approval, or modification'
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
    it('should validate result with approved PRD', () => {
      const validResult = {
        approved: true,
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with modifications', () => {
      const validResult = {
        approved: false,
        modifications: [
          {
            section: 'Functional Requirements',
            modificationReason: 'User requested changes',
            requestedContent: 'Modified content',
          },
        ],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing approved', () => {
      const invalidResult = {
        modifications: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('PRD Review Guidance Generation', () => {
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

      expect(response.promptForLLM).toContain('PRD review session');
      expect(response.promptForLLM).toContain('/path/to/prd.md');
      expect(response.promptForLLM).toContain('File Path');
    });

    it('should include review process instructions', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Review Process');
      expect(response.promptForLLM).toContain('APPROVE');
      expect(response.promptForLLM).toContain('MODIFY');
      expect(response.promptForLLM).toContain('REJECT');
    });

    it('should include review guidelines', async () => {
      const input = {
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Review Guidelines');
      expect(response.promptForLLM).toContain('Completeness');
      expect(response.promptForLLM).toContain('Clarity');
      expect(response.promptForLLM).toContain('Accuracy');
      expect(response.promptForLLM).toContain('Traceability');
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
      expect(response.promptForLLM).toContain('magi-prd-orchestrator');
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
