/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeRequirementsReviewTool } from '../../../../../src/tools/magi/prd/magi-prd-requirements-review/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativeRequirementsReviewTool', () => {
  let tool: SFMobileNativeRequirementsReviewTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeRequirementsReviewTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-requirements-review');
      expect(tool.toolMetadata.title).toBe('Magi - Requirements Review and Approval');
      expect(tool.toolMetadata.description).toBe(
        'Presents functional requirements to the user for review, approval, rejection, or modification'
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
    it('should accept valid input with functional requirements', () => {
      const validInput = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement Title',
            description: 'Requirement description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty requirements array', () => {
      const validInput = {
        functionalRequirements: [],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing functionalRequirements', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject requirements with invalid priority', () => {
      const invalidInput = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'invalid' as unknown as 'high' | 'medium' | 'low',
            category: 'UI/UX',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with approved requirements', () => {
      const validResult = {
        approvedRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
        rejectedRequirements: [],
        modifiedRequirements: [],
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with modified requirements', () => {
      const validResult = {
        approvedRequirements: [],
        rejectedRequirements: [],
        modifiedRequirements: [
          {
            id: 'REQ-002',
            title: 'Modified Requirement',
            description: 'Modified description',
            priority: 'medium' as const,
            category: 'Security',
            originalId: 'REQ-001',
            modificationNotes: 'Updated description',
          },
        ],
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with user feedback', () => {
      const validResult = {
        approvedRequirements: [],
        rejectedRequirements: [],
        modifiedRequirements: [],
        reviewSummary: 'Review summary',
        userFeedback: 'Feedback',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing reviewSummary', () => {
      const invalidResult = {
        approvedRequirements: [],
        rejectedRequirements: [],
        modifiedRequirements: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Requirements Review Guidance Generation', () => {
    it('should generate guidance with functional requirements', async () => {
      const input = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement Title',
            description: 'Requirement description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('requirements review session');
      expect(response.promptForLLM).toContain('REQ-001');
      expect(response.promptForLLM).toContain('Requirement Title');
    });

    it('should format requirements list correctly', async () => {
      const input = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'First Requirement',
            description: 'First description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
          {
            id: 'REQ-002',
            title: 'Second Requirement',
            description: 'Second description',
            priority: 'medium' as const,
            category: 'Security',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('1. **First Requirement**');
      expect(response.promptForLLM).toContain('2. **Second Requirement**');
      expect(response.promptForLLM).toContain('REQ-001');
      expect(response.promptForLLM).toContain('REQ-002');
    });

    it('should include review process instructions', async () => {
      const input = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Review Process');
      expect(response.promptForLLM).toContain('APPROVE');
      expect(response.promptForLLM).toContain('REJECT');
      expect(response.promptForLLM).toContain('MODIFY');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
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
    it('should handle empty requirements array', async () => {
      const input = {
        functionalRequirements: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle many requirements', async () => {
      const manyRequirements = Array.from({ length: 50 }, (_, i) => ({
        id: `REQ-${String(i + 1).padStart(3, '0')}`,
        title: `Requirement ${i + 1}`,
        description: `Description ${i + 1}`,
        priority: 'high' as const,
        category: 'UI/UX',
      }));

      const input = {
        functionalRequirements: manyRequirements,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
