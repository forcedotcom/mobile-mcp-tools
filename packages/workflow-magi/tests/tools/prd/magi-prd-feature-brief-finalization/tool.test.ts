/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiFeatureBriefFinalizationTool } from '../../../../src/tools/prd/magi-prd-feature-brief-finalization/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiFeatureBriefFinalizationTool', () => {
  let tool: MagiFeatureBriefFinalizationTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiFeatureBriefFinalizationTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-feature-brief-finalization');
      expect(tool.toolMetadata.title).toBe('Magi - Finalize Feature Brief');
      expect(tool.toolMetadata.description).toBe(
        'Finalizes the feature brief by updating the status to "approved" after user approval. Takes the path to the feature brief file and returns the updated content.'
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
    it('should accept valid input with featureBriefPath', () => {
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
  });

  describe('Result Schema Validation', () => {
    it('should validate result with finalizedFeatureBriefContent', () => {
      const validResult = {
        finalizedFeatureBriefContent:
          '# Feature Brief\n\n## Status\n**Status**: approved\n\nContent',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing finalizedFeatureBriefContent', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Feature Brief Finalization Guidance Generation', () => {
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

      expect(response.promptForLLM).toContain('finalizing a feature brief');
      expect(response.promptForLLM).toContain('/path/to/feature-brief.md');
      expect(response.promptForLLM).toContain('File Path');
    });

    it('should include finalization process instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Finalization Process');
      expect(response.promptForLLM).toContain('approved');
      expect(response.promptForLLM).toContain('Status section');
    });

    it('should include critical requirements', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('CRITICAL REQUIREMENTS');
      expect(response.promptForLLM).toContain('ABSOLUTELY FORBIDDEN');
      expect(response.promptForLLM).toContain('Preserve all formatting');
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
      expect(response.resultSchema).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty feature brief path', async () => {
      const input = {
        featureBriefPath: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle long feature brief path', async () => {
      const longPath = '/path/to/' + 'nested/'.repeat(50) + 'feature-brief.md';
      const input = {
        featureBriefPath: longPath,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
