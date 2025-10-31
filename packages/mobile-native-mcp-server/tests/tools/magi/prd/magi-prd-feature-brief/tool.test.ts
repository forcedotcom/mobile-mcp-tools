/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiFeatureBriefGenerationTool } from '../../../../../src/tools/magi/prd/magi-prd-feature-brief/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiFeatureBriefGenerationTool', () => {
  let tool: MagiFeatureBriefGenerationTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiFeatureBriefGenerationTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-feature-brief');
      expect(tool.toolMetadata.title).toBe('Magi - Generate Feature Brief');
      expect(tool.toolMetadata.description).toBe(
        'Guides LLM through the process creating a feature brief from a user utterance'
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
    it('should accept valid input with user utterance and feature IDs', () => {
      const validInput = {
        userUtterance: 'Add user authentication',
        currentFeatureIds: ['feature-1', 'feature-2'],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty feature IDs array', () => {
      const validInput = {
        userUtterance: 'Add new feature',
        currentFeatureIds: [],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept different types of user utterance', () => {
      const validInput = {
        userUtterance: { text: 'Add feature', priority: 'high' },
        currentFeatureIds: ['feature-1'],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with undefined userUtterance (z.unknown allows undefined)', () => {
      const inputWithUndefined = {
        userUtterance: undefined,
        currentFeatureIds: ['feature-1'],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(inputWithUndefined);
      // Note: z.unknown() accepts undefined by default
      expect(result.success).toBe(true);
    });

    it('should reject input missing currentFeatureIds', () => {
      const invalidInput = {
        userUtterance: 'Add feature',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      // Note: z.array() requires the field, but z.unknown() accepts undefined
      expect(result.success).toBe(false);
    });

    it('should reject non-array currentFeatureIds', () => {
      const invalidInput = {
        userUtterance: 'Add feature',
        currentFeatureIds: 'not-an-array' as unknown as string[],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with feature brief and feature ID', () => {
      const validResult = {
        featureBriefMarkdown: '# Feature Brief\n\nTest content',
        recommendedFeatureId: 'user-authentication',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing featureBriefMarkdown', () => {
      const invalidResult = {
        recommendedFeatureId: 'user-authentication',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it('should reject result missing recommendedFeatureId', () => {
      const invalidResult = {
        featureBriefMarkdown: '# Feature Brief',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Feature Brief Guidance Generation', () => {
    it('should generate guidance with user utterance', async () => {
      const input = {
        userUtterance: 'Add user authentication with login and logout',
        currentFeatureIds: ['existing-feature'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('ROLE');
      expect(response.promptForLLM).toContain('TASK');
      expect(response.promptForLLM).toContain('Add user authentication');
      expect(response.promptForLLM).toContain('existing-feature');
    });

    it('should include feature ID generation instructions', async () => {
      const input = {
        userUtterance: 'Add notifications',
        currentFeatureIds: ['feature-1'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('kebab-case');
      expect(response.promptForLLM).toContain('unique');
      expect(response.promptForLLM).toContain('EXAMPLES');
    });

    it('should include validation requirements', async () => {
      const input = {
        userUtterance: 'Add feature',
        currentFeatureIds: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('VALIDATION');
      expect(response.promptForLLM).toContain('lowercase');
      expect(response.promptForLLM).toContain('hyphens');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        userUtterance: 'Add feature',
        currentFeatureIds: [],
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
    it('should handle empty currentFeatureIds', async () => {
      const input = {
        userUtterance: 'Add feature',
        currentFeatureIds: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toBeDefined();
    });

    it('should handle complex user utterance objects', async () => {
      const input = {
        userUtterance: {
          description: 'Add authentication',
          requirements: ['login', 'logout'],
          priority: 'high',
        },
        currentFeatureIds: ['feature-1'],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);
      expect(response.promptForLLM).toBeDefined();
    });

    it('should handle many existing feature IDs', async () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => `feature-${i}`);
      const input = {
        userUtterance: 'Add new feature',
        currentFeatureIds: manyIds,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
