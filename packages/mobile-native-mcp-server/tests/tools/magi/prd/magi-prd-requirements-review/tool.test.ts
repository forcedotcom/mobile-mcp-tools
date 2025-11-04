/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiRequirementsReviewTool } from '../../../../../src/tools/magi/prd/magi-prd-requirements-review/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiRequirementsReviewTool', () => {
  let tool: MagiRequirementsReviewTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiRequirementsReviewTool(mockServer);
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
        'Reviews the requirements.md file with the user, facilitating approval, rejection, or modification of requirements. Returns review feedback including approved/rejected IDs and modification requests.'
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
    it('should accept valid input with requirements path', () => {
      const validInput = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty requirements path', () => {
      const validInput = {
        requirementsPath: '',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing requirementsPath', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with approved and rejected requirement IDs', () => {
      const validResult = {
        approvedRequirementIds: ['REQ-001', 'REQ-003'],
        rejectedRequirementIds: ['REQ-002'],
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing approvedRequirementIds', () => {
      const invalidResult = {
        rejectedRequirementIds: [],
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject result missing rejectedRequirementIds', () => {
      const invalidResult = {
        approvedRequirementIds: [],
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Requirements Review Guidance Generation', () => {
    it('should generate guidance with requirements path', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('requirements review session');
      expect(response.promptForLLM).toContain('/path/to/requirements.md');
      expect(response.promptForLLM).toContain('File Path');
    });

    it('should include requirements path in guidance', async () => {
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const input = {
        requirementsPath,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Current Requirements Document');
      expect(response.promptForLLM).toContain(requirementsPath);
    });

    it('should include review process instructions', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Review Process');
      expect(response.promptForLLM).toContain('approve');
      expect(response.promptForLLM).toContain('reject');
      expect(response.promptForLLM).toContain('modify');
    });

    it('should include output format instructions', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Output Format');
      expect(response.promptForLLM).toContain('approvedRequirementIds');
      expect(response.promptForLLM).toContain('rejectedRequirementIds');
      expect(response.resultSchema).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requirements path', async () => {
      const input = {
        requirementsPath: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle missing requirements path', async () => {
      const input = {
        requirementsPath: '/path/to/missing/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle long requirements path', async () => {
      const longPath = '/path/to/' + 'nested/'.repeat(50) + 'requirements.md';
      const input = {
        requirementsPath: longPath,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
