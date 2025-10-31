/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeGapAnalysisTool } from '../../../../../src/tools/magi/prd/magi-prd-gap-analysis/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativeGapAnalysisTool', () => {
  let tool: SFMobileNativeGapAnalysisTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeGapAnalysisTool(mockServer);
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
    it('should accept valid input with feature brief and requirements', () => {
      const validInput = {
        featureBrief: '# Feature Brief\n\nContent',
        requirementsContent: '# Requirements\n\nREQ-001: Requirement',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing featureBrief', () => {
      const invalidInput = {
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing requirementsContent', () => {
      const invalidInput = {
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
        requirementStrengths: [
          {
            requirementId: 'REQ-001',
            strengthScore: 8,
            strengths: ['Clear description'],
            weaknesses: ['Missing details'],
          },
        ],
        recommendations: ['Add more details'],
        summary: 'Gap analysis summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with userWantsToContinueDespiteGaps', () => {
      const validResult = {
        gapAnalysisScore: 60,
        identifiedGaps: [],
        requirementStrengths: [],
        recommendations: [],
        summary: 'Summary',
        userWantsToContinueDespiteGaps: true,
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate score within 0-100 range', () => {
      const validResult = {
        gapAnalysisScore: 0,
        identifiedGaps: [],
        requirementStrengths: [],
        recommendations: [],
        summary: 'Summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject score outside 0-100 range', () => {
      const invalidResult = {
        gapAnalysisScore: 101,
        identifiedGaps: [],
        requirementStrengths: [],
        recommendations: [],
        summary: 'Summary',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Gap Analysis Guidance Generation', () => {
    it('should generate guidance with feature brief and requirements', async () => {
      const input = {
        featureBrief: '# Feature Brief\n\nContent',
        requirementsContent: '# Requirements\n\nREQ-001: Requirement',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('gap analysis');
      expect(response.promptForLLM).toContain('# Feature Brief');
      expect(response.promptForLLM).toContain('# Requirements');
    });

    it('should include analysis task instructions', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
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

    it('should include field requirements guidance', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Field Requirements');
      expect(response.promptForLLM).toContain('identifiedGaps');
      expect(response.promptForLLM).toContain('gapAnalysisScore');
      expect(response.promptForLLM).toContain('severity');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
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
        featureBrief: '# Feature Brief',
        requirementsContent: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle very long requirements content', async () => {
      const longContent = '# Requirements\n\n' + 'REQ-001: Requirement\n'.repeat(200);
      const input = {
        featureBrief: '# Feature Brief',
        requirementsContent: longContent,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
