/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiRequirementsFinalizationTool } from '../../../../src/tools/prd/magi-prd-requirements-finalization/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiRequirementsFinalizationTool', () => {
  let tool: MagiRequirementsFinalizationTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiRequirementsFinalizationTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-requirements-finalization');
      expect(tool.toolMetadata.title).toBe('Magi - Finalize Requirements for PRD Generation');
      expect(tool.toolMetadata.description).toBe(
        'Finalizes the requirements file by ensuring all requirements are reviewed and updating status to "approved" before proceeding to PRD generation.'
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
    it('should accept valid input with requirementsPath', () => {
      const validInput = {
        requirementsPath: '/path/to/requirements.md',
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
    it('should validate result with finalizedRequirementsContent', () => {
      const validResult = {
        finalizedRequirementsContent: '# Requirements\n\n## Status\n**Status**: approved\n\nContent',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing finalizedRequirementsContent', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Requirements Finalization Guidance Generation', () => {
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

      expect(response.promptForLLM).toContain('finalizing the requirements document');
      expect(response.promptForLLM).toContain('/path/to/requirements.md');
      expect(response.promptForLLM).toContain('File Path');
    });

    it('should include finalization process instructions', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Finalization Process');
      expect(response.promptForLLM).toContain('approved');
      expect(response.promptForLLM).toContain('Pending Review Requirements');
    });

    it('should include format preservation requirements', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Critical Format Preservation Requirements');
      expect(response.promptForLLM).toContain('STRICTLY PRESERVE EXISTING FORMAT');
      expect(response.promptForLLM).toContain('Preserve all formatting');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
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
    it('should handle empty requirements path', async () => {
      const input = {
        requirementsPath: '',
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

