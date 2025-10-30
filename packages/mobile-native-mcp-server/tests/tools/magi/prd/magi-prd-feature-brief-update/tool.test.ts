/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiFeatureBriefUpdateTool } from '../../../../../src/tools/magi/prd/magi-prd-feature-brief-update/tool.js';
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
        'Updates an existing feature brief based on user feedback and modification requests from the review process'
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
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief\n\nContent',
        userUtterance: 'Original request',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with modifications', () => {
      const validInput = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with user feedback', () => {
      const validInput = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        userFeedback: 'Need more details',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing existingFeatureId', () => {
      const invalidInput = {
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing featureBrief', () => {
      const invalidInput = {
        existingFeatureId: 'feature-123',
        userUtterance: 'Original request',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept input with undefined userUtterance (z.unknown allows undefined)', () => {
      const inputWithUndefined = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: undefined,
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(inputWithUndefined);
      // Note: z.unknown() accepts undefined by default
      expect(result.success).toBe(true);
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
    it('should generate guidance with existing feature brief', async () => {
      const input = {
        existingFeatureId: 'user-authentication',
        featureBrief: '# Feature Brief\n\nOriginal content',
        userUtterance: 'Add authentication',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('ROLE');
      expect(response.promptForLLM).toContain('user-authentication');
      expect(response.promptForLLM).toContain('# Feature Brief');
      expect(response.promptForLLM).toContain('Original content');
    });

    it('should include feature ID preservation instruction', async () => {
      const input = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('MUST be preserved');
      expect(response.promptForLLM).toContain('feature-123');
    });

    it('should include modifications when provided', async () => {
      const input = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Requested Modifications');
      expect(response.promptForLLM).toContain('Overview');
      expect(response.promptForLLM).toContain('Needs more detail');
    });

    it('should include user feedback when provided', async () => {
      const input = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        userFeedback: 'Need more details',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('User Feedback');
      expect(response.promptForLLM).toContain('Need more details');
    });

    it('should handle missing feature brief gracefully', async () => {
      const input = {
        existingFeatureId: 'feature-123',
        featureBrief: '',
        userUtterance: 'Original request',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Existing feature brief content not found');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
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
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: 'Original request',
        modifications: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toContain('No specific modifications requested');
    });

    it('should handle complex user utterance objects', async () => {
      const input = {
        existingFeatureId: 'feature-123',
        featureBrief: '# Feature Brief',
        userUtterance: { text: 'Update', details: { priority: 'high' } },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
