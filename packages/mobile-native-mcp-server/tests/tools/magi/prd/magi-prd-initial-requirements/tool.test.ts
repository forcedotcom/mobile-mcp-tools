/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiInitialRequirementsTool } from '../../../../../src/tools/magi/prd/magi-prd-initial-requirements/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiInitialRequirementsTool', () => {
  let tool: MagiInitialRequirementsTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiInitialRequirementsTool(mockServer);
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
    it('should accept valid input with feature brief path', () => {
      const validInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing featureBriefPath', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing workflowStateData', () => {
      const invalidInput = {
        featureBriefPath: '/path/to/feature-brief.md',
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with requirements markdown', () => {
      const validResult = {
        requirementsMarkdown:
          '# Requirements\n\n## Status\n**Status**: draft\n\n## Pending Review Requirements\n\n### REQ-001: Requirement Title\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Requirement description',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with multiple requirements in markdown', () => {
      const validResult = {
        requirementsMarkdown:
          '# Requirements\n\n## Status\n**Status**: draft\n\n## Pending Review Requirements\n\n### REQ-001: Requirement 1\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Description 1\n\n### REQ-002: Requirement 2\n- **Priority**: medium\n- **Category**: Security\n- **Description**: Description 2',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing requirementsMarkdown', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Initial Requirements Guidance Generation', () => {
    it('should generate guidance with feature brief path', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('product requirements analyst');
      expect(response.promptForLLM).toContain('File Path');
      expect(response.promptForLLM).toContain('/path/to/feature-brief.md');
    });

    it('should include task instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
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
        featureBriefPath: '/path/to/feature-brief.md',
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
        featureBriefPath: '/path/to/feature-brief.md',
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
    it('should handle long file path', async () => {
      const input = {
        featureBriefPath: '/very/long/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle path with special characters', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief (v2).md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
