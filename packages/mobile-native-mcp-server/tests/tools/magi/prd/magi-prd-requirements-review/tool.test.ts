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
        'Reviews the requirements.md file with the user, facilitating approval, rejection, or modification of requirements. Returns updated requirements.md content.'
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
    it('should accept valid input with requirements content', () => {
      const validInput = {
        requirementsContent: '# Requirements\n\n## Approved Requirements\n\n### REQ-001: Test',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty requirements content', () => {
      const validInput = {
        requirementsContent: '',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing requirementsContent', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with updated requirements content', () => {
      const validResult = {
        updatedRequirementsContent:
          '# Requirements\n\n## Approved Requirements\n\n### REQ-001: Test',
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing updatedRequirementsContent', () => {
      const invalidResult = {
        reviewSummary: 'Review summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject result missing reviewSummary', () => {
      const invalidResult = {
        updatedRequirementsContent: '# Requirements',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Requirements Review Guidance Generation', () => {
    it('should generate guidance with requirements content', async () => {
      const input = {
        requirementsContent:
          '# Requirements\n\n## Approved Requirements\n\n### REQ-001: Requirement Title\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Requirement description',
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

    it('should include requirements content in guidance', async () => {
      const requirementsContent =
        '# Requirements\n\n**Feature ID:** FEAT-001\n\n## Approved Requirements\n\n### REQ-001: First Requirement\n- **Priority**: high\n- **Category**: UI/UX';
      const input = {
        requirementsContent,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Current Requirements Document');
      expect(response.promptForLLM).toContain('REQ-001');
      expect(response.promptForLLM).toContain('First Requirement');
    });

    it('should include review process instructions', async () => {
      const input = {
        requirementsContent:
          '# Requirements\n\n### REQ-001: Requirement\n- **Description**: Description',
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
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Output Format');
      expect(response.promptForLLM).toContain('updatedRequirementsContent');
      expect(response.promptForLLM).toContain('reviewSummary');
      expect(response.resultSchema).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requirements content', async () => {
      const input = {
        requirementsContent: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle missing requirements content', async () => {
      const input = {
        requirementsContent: '# Requirements\n\nNo requirements have been generated yet.',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle large requirements document', async () => {
      const largeContent = `# Requirements\n\n${Array.from({ length: 50 }, (_, i) => `### REQ-${String(i + 1).padStart(3, '0')}: Requirement ${i + 1}\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Description ${i + 1}`).join('\n\n')}`;

      const input = {
        requirementsContent: largeContent,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
