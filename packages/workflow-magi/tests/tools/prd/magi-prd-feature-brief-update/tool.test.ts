/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiFeatureBriefUpdateTool } from '../../../../src/tools/prd/magi-prd-feature-brief-update/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiFeatureBriefUpdateTool', () => {
  let tool: MagiFeatureBriefUpdateTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiFeatureBriefUpdateTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-feature-brief-update');
      expect(tool.toolMetadata.title).toBe('Magi - Update Feature Brief');
      expect(tool.toolMetadata.description).toBe(
        'Updates an existing feature brief based on user feedback and modification requests. This tool is ONLY used when modifications are requested (not for approvals).'
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
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated content',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with modifications', () => {
      const validInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated content',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with approved review result', () => {
      const validInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: true,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing featureBriefPath', () => {
      const invalidInput = {
        reviewResult: {
          approved: false,
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing reviewResult', () => {
      const invalidInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing workflowStateData', () => {
      const invalidInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
        },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with updated feature brief', () => {
      const validResult = {
        featureBriefMarkdown: '# Updated Feature Brief\n\nUpdated content',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing featureBriefMarkdown', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Feature Brief Update Guidance Generation', () => {
    it('should generate guidance with feature brief path', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated content',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('ROLE');
      expect(response.promptForLLM).toContain('/path/to/feature-brief.md');
      expect(response.promptForLLM).toContain('File Path');
    });

    it('should include modification instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated content',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Requested Modifications');
      expect(response.promptForLLM).toContain('Overview');
      expect(response.promptForLLM).toContain('Needs more detail');
    });

    it('should handle review result without modifications', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('No specific modifications requested');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated content',
            },
          ],
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
    it('should handle empty modifications array', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toContain('No specific modifications requested');
    });

    it('should handle complex modification requests', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        reviewResult: {
          approved: false,
          modifications: [
            {
              section: 'Overview',
              modificationReason: 'Needs more detail',
              requestedContent: 'Updated content',
            },
            {
              section: 'User Stories',
              modificationReason: 'Missing edge cases',
              requestedContent: 'Add edge case stories',
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
