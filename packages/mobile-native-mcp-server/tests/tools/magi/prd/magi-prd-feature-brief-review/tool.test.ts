/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiFeatureBriefReviewTool } from '../../../../../src/tools/magi/prd/magi-prd-feature-brief-review/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiFeatureBriefReviewTool', () => {
  let tool: MagiFeatureBriefReviewTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiFeatureBriefReviewTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-feature-brief-review');
      expect(tool.toolMetadata.title).toBe('Magi - Feature Brief Review');
      expect(tool.toolMetadata.description).toBe(
        'Presents feature brief to the user for review, approval, or modification'
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
    it('should accept valid input with feature brief', () => {
      const validInput = {
        featureBrief: '# Feature Brief\n\nTest content',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty feature brief', () => {
      const validInput = {
        featureBrief: '',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing featureBrief', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing workflowStateData', () => {
      const invalidInput = {
        featureBrief: '# Feature Brief',
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with approved brief', () => {
      const validResult = {
        approved: true,
        reviewSummary: 'Feature brief approved',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with modifications', () => {
      const validResult = {
        approved: false,
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
        reviewSummary: 'Feature brief requires modifications',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with user feedback', () => {
      const validResult = {
        approved: true,
        userFeedback: 'Looks good!',
        reviewSummary: 'Approved with feedback',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing approved', () => {
      const invalidResult = {
        reviewSummary: 'Some summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject result missing reviewSummary', () => {
      const invalidResult = {
        approved: true,
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Feature Brief Review Guidance Generation', () => {
    it('should generate guidance with feature brief content', async () => {
      const input = {
        featureBrief: '# Feature Brief\n\nThis is test content.',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('feature brief review session');
      expect(response.promptForLLM).toContain('# Feature Brief');
      expect(response.promptForLLM).toContain('This is test content');
    });

    it('should include review process instructions', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Review Process');
      expect(response.promptForLLM).toContain('APPROVE');
      expect(response.promptForLLM).toContain('REQUEST MODIFICATIONS');
    });

    it('should include workflow rules', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('CRITICAL WORKFLOW RULES');
      expect(response.promptForLLM).toContain('MANDATORY');
      expect(response.promptForLLM).toContain('approved to false');
      expect(response.promptForLLM).toContain('modifications');
    });

    it('should handle missing feature brief gracefully', async () => {
      const input = {
        featureBrief: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Feature brief content not found');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        featureBrief: '# Feature Brief',
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
    it('should handle very long feature brief content', async () => {
      const longContent = '# Feature Brief\n\n' + 'Content line.\n'.repeat(500);
      const input = {
        featureBrief: longContent,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toContain(longContent);
    });

    it('should handle feature brief with special characters', async () => {
      const input = {
        featureBrief: '# Feature Brief\n\nContent with "quotes" and <tags>',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
