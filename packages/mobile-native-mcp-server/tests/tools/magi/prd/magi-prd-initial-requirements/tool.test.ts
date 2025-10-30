/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeInitialRequirementsTool } from '../../../../../src/tools/magi/prd/magi-prd-initial-requirements/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativeInitialRequirementsTool', () => {
  let tool: SFMobileNativeInitialRequirementsTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeInitialRequirementsTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-initial-requirements');
      expect(tool.toolMetadata.title).toBe(
        'Magi - Generate Initial Requirements from Feature Brief'
      );
      expect(tool.toolMetadata.description).toBe(
        'Analyzes the feature brief to propose initial functional requirements'
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
        featureBrief: '# Feature Brief\n\nContent',
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
    it('should validate result with functional requirements', () => {
      const validResult = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement Title',
            description: 'Requirement description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
        summary: 'Requirements summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with multiple requirements', () => {
      const validResult = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement 1',
            description: 'Description 1',
            priority: 'high' as const,
            category: 'UI/UX',
          },
          {
            id: 'REQ-002',
            title: 'Requirement 2',
            description: 'Description 2',
            priority: 'medium' as const,
            category: 'Security',
          },
        ],
        summary: 'Summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing functionalRequirements', () => {
      const invalidResult = {
        summary: 'Summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject result missing summary', () => {
      const invalidResult = {
        functionalRequirements: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Initial Requirements Guidance Generation', () => {
    it('should generate guidance with feature brief', async () => {
      const input = {
        featureBrief: '# Feature Brief\n\nTest content',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('product requirements analyst');
      expect(response.promptForLLM).toContain('# Feature Brief');
      expect(response.promptForLLM).toContain('Test content');
    });

    it('should include task instructions', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Your Task');
      expect(response.promptForLLM).toContain('Comprehensive Coverage');
      expect(response.promptForLLM).toContain('Mobile Native Focus');
      expect(response.promptForLLM).toContain('Salesforce Integration');
    });

    it('should include requirements quality standards', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Requirements Quality Standards');
      expect(response.promptForLLM).toContain('Specific and Actionable');
      expect(response.promptForLLM).toContain('Prioritized');
      expect(response.promptForLLM).toContain('Categories to Consider');
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
    it('should handle empty feature brief', async () => {
      const input = {
        featureBrief: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle very long feature brief', async () => {
      const longBrief = '# Feature Brief\n\n' + 'Content line.\n'.repeat(500);
      const input = {
        featureBrief: longBrief,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
