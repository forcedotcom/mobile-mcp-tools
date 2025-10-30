/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativePRDGenerationTool } from '../../../../../src/tools/magi/prd/magi-prd-generation/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativePRDGenerationTool', () => {
  let tool: SFMobileNativePRDGenerationTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativePRDGenerationTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-generation');
      expect(tool.toolMetadata.title).toBe('Magi - PRD Generation');
      expect(tool.toolMetadata.description).toBe(
        'Generates a comprehensive Product Requirements Document (PRD.md) from approved feature brief and requirements'
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
        originalUserUtterance: 'Add authentication feature',
        featureBrief: '# Feature Brief\n\nContent',
        requirementsContent: '# Requirements\n\nREQ-001: Requirement',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing originalUserUtterance', () => {
      const invalidInput = {
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing featureBrief', () => {
      const invalidInput = {
        originalUserUtterance: 'Add feature',
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing requirementsContent', () => {
      const invalidInput = {
        originalUserUtterance: 'Add feature',
        featureBrief: '# Feature Brief',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with all required fields', () => {
      const validResult = {
        prdContent: '# PRD\n\nContent',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        requirementsCount: 5,
        traceabilityTableRows: [
          {
            requirementId: 'REQ-001',
            technicalRequirementIds: 'TBD',
            userStoryIds: 'TBD',
          },
        ],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate finalized status', () => {
      const validResult = {
        prdContent: '# PRD',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'finalized' as const,
        },
        requirementsCount: 0,
        traceabilityTableRows: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing prdContent', () => {
      const invalidResult = {
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        requirementsCount: 0,
        traceabilityTableRows: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('PRD Generation Guidance', () => {
    it('should generate guidance with all input content', async () => {
      const input = {
        originalUserUtterance: 'Add authentication',
        featureBrief: '# Feature Brief\n\nContent',
        requirementsContent: '# Requirements\n\nREQ-001: Requirement',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Product Requirements Document');
      expect(response.promptForLLM).toContain('Add authentication');
      expect(response.promptForLLM).toContain('# Feature Brief');
      expect(response.promptForLLM).toContain('# Requirements');
    });

    it('should include PRD structure requirements', async () => {
      const input = {
        originalUserUtterance: 'Add feature',
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Document Status');
      expect(response.promptForLLM).toContain('Original User Utterance');
      expect(response.promptForLLM).toContain('Feature Brief');
      expect(response.promptForLLM).toContain('Functional Requirements');
      expect(response.promptForLLM).toContain('Traceability');
    });

    it('should include requirement filtering instructions', async () => {
      const input = {
        originalUserUtterance: 'Add feature',
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('approved requirements');
      expect(response.promptForLLM).toContain('modified requirements');
      expect(response.promptForLLM).toContain('Ignore');
      expect(response.promptForLLM).toContain('rejected requirements');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        originalUserUtterance: 'Add feature',
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
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
    it('should handle empty requirements content', async () => {
      const input = {
        originalUserUtterance: 'Add feature',
        featureBrief: '# Feature Brief',
        requirementsContent: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle very long requirements content', async () => {
      const longContent = '# Requirements\n\n' + 'REQ-001: Requirement\n'.repeat(100);
      const input = {
        originalUserUtterance: 'Add feature',
        featureBrief: '# Feature Brief',
        requirementsContent: longContent,
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
