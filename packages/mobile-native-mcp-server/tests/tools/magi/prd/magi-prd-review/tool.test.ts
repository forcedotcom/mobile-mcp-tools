/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativePRDReviewTool } from '../../../../../src/tools/magi/prd/magi-prd-review/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativePRDReviewTool', () => {
  let tool: SFMobileNativePRDReviewTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativePRDReviewTool(mockServer);
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
    it('should accept valid input with all required fields', () => {
      const validInput = {
        prdContent: '# PRD Content\n\nThis is test PRD content.',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept finalized status', () => {
      const validInput = {
        prdContent: '# PRD Content',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'finalized' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing prdContent', () => {
      const invalidInput = {
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing prdFilePath', () => {
      const invalidInput = {
        prdContent: '# PRD Content',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing documentStatus', () => {
      const invalidInput = {
        prdContent: '# PRD Content',
        prdFilePath: '/path/to/prd.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid document status', () => {
      const invalidInput = {
        prdContent: '# PRD Content',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'invalid' as unknown as 'draft' | 'finalized',
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with approved PRD', () => {
      const validResult = {
        prdApproved: true,
        reviewSummary: 'PRD approved by user',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with modifications', () => {
      const validResult = {
        prdApproved: false,
        prdModifications: [
          {
            section: 'Functional Requirements',
            originalContent: 'Original content',
            modifiedContent: 'Modified content',
            modificationReason: 'User requested changes',
          },
        ],
        reviewSummary: 'PRD requires modifications',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with user feedback', () => {
      const validResult = {
        prdApproved: true,
        userFeedback: 'Great work on the PRD!',
        reviewSummary: 'PRD approved with positive feedback',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing prdApproved', () => {
      const invalidResult = {
        reviewSummary: 'Some summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject result missing reviewSummary', () => {
      const invalidResult = {
        prdApproved: true,
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('PRD Review Guidance Generation', () => {
    it('should generate guidance with PRD content', async () => {
      const input = {
        prdContent: '# Test PRD\n\nThis is test content.',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('PRD review session');
      expect(response.promptForLLM).toContain('# Test PRD');
      expect(response.promptForLLM).toContain('/path/to/prd.md');
      expect(response.promptForLLM).toContain('AI Assistant');
      expect(response.promptForLLM).toContain('2025-01-01');
      expect(response.promptForLLM).toContain('draft');
    });

    it('should include review process instructions', async () => {
      const input = {
        prdContent: '# PRD Content',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'Author',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
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
        prdContent: '# PRD Content',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'Author',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
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
        prdContent: '# PRD Content',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'Author',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
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
    it('should handle empty PRD content', async () => {
      const input = {
        prdContent: '',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle long PRD content', async () => {
      const longContent = '# PRD\n\n' + 'Test content.\n'.repeat(1000);
      const input = {
        prdContent: longContent,
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toContain(longContent);
    });
  });
});
