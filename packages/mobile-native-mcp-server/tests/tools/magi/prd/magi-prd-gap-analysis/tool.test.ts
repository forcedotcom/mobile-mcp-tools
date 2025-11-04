/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiGapAnalysisTool } from '../../../../../src/tools/magi/prd/magi-prd-gap-analysis/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiGapAnalysisTool', () => {
  let tool: MagiGapAnalysisTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiGapAnalysisTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-gap-analysis');
      expect(tool.toolMetadata.title).toBe('Magi - Gap Analysis');
      expect(tool.toolMetadata.description).toBe(
        'Analyzes current functional requirements against the feature brief to identify gaps, score requirement strengths, and provide improvement recommendations'
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
    it('should accept valid input with feature brief and requirements paths', () => {
      const validInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing featureBriefPath', () => {
      const invalidInput = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing requirementsPath', () => {
      const invalidInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with all required fields', () => {
      const validResult = {
        gapAnalysisScore: 75,
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Missing authentication',
            description: 'No authentication requirements',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Security vulnerability',
            suggestedRequirements: [
              {
                title: 'Add authentication',
                description: 'Requirement description',
                priority: 'high' as const,
                category: 'Security',
              },
            ],
          },
        ],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with empty gaps array', () => {
      const validResult = {
        gapAnalysisScore: 100,
        identifiedGaps: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate score within 0-100 range', () => {
      const validResult = {
        gapAnalysisScore: 0,
        identifiedGaps: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject score outside 0-100 range', () => {
      const invalidResult = {
        gapAnalysisScore: 101,
        identifiedGaps: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Gap Analysis Guidance Generation', () => {
    it('should generate guidance with feature brief and requirements paths', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('gap analysis');
      expect(response.promptForLLM).toContain('File Path');
      expect(response.promptForLLM).toContain('/path/to/feature-brief.md');
      expect(response.promptForLLM).toContain('/path/to/requirements.md');
    });

    it('should include analysis task instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Your Task');
      expect(response.promptForLLM).toContain('Coverage');
      expect(response.promptForLLM).toContain('Completeness');
      expect(response.promptForLLM).toContain('Clarity');
      expect(response.promptForLLM).toContain('Feasibility');
    });

    it('should include requirement filtering instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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

    it('should include result schema guidance', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('identifiedGaps');
      expect(response.promptForLLM).toContain('gapAnalysisScore');
      expect(response.promptForLLM).toContain('severity');
      expect(response.resultSchema).toBeDefined();
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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
    it('should handle long file paths', async () => {
      const input = {
        featureBriefPath: '/very/long/path/to/feature-brief.md',
        requirementsPath: '/very/long/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle paths with special characters', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief (v2).md',
        requirementsPath: '/path/to/requirements_v1.md',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
