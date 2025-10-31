/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeGapBasedFunctionalRequirementsTool } from '../../../../../src/tools/magi/prd/magi-prd-gap-based-functional-requirements/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativeGapBasedFunctionalRequirementsTool', () => {
  let tool: SFMobileNativeGapBasedFunctionalRequirementsTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeGapBasedFunctionalRequirementsTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-gap-based-functional-requirements');
      expect(tool.toolMetadata.title).toBe('Magi - Gap-Based Functional Requirements Generation');
      expect(tool.toolMetadata.description).toBe(
        'Generates functional requirements based on identified gaps. For initial requirements generation, use magi-prd-initial-requirements instead.'
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
    it('should accept valid input with gaps and feature brief', () => {
      const validInput = {
        featureBrief: '# Feature Brief',
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
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with optional requirements content', () => {
      const validInput = {
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Gap',
            description: 'Description',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Impact',
            suggestedRequirements: [],
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing identifiedGaps', () => {
      const invalidInput = {
        featureBrief: '# Feature Brief',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input with empty gaps array', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        identifiedGaps: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      await expect(tool.handleRequest(input)).rejects.toThrow(
        'Gap-based functional requirements tool requires identified gaps'
      );
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with functional requirements', () => {
      const validResult = {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'high' as const,
            category: 'Security',
          },
        ],
        summary: 'Summary',
        gapsAddressed: ['GAP-001'],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing functionalRequirements', () => {
      const invalidResult = {
        summary: 'Summary',
        gapsAddressed: [],
      };
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Gap-Based Requirements Guidance Generation', () => {
    it('should generate guidance with gaps', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Missing authentication',
            description: 'No authentication',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Vulnerability',
            suggestedRequirements: [
              {
                title: 'Add auth',
                description: 'Auth requirement',
                priority: 'high' as const,
                category: 'Security',
              },
            ],
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('requirements analyst');
      expect(response.promptForLLM).toContain('# Feature Brief');
      expect(response.promptForLLM).toContain('GAP-001');
      expect(response.promptForLLM).toContain('Missing authentication');
    });

    it('should include gaps list in guidance', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Gap 1',
            description: 'Description 1',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Impact 1',
            suggestedRequirements: [
              {
                title: 'Req 1',
                description: 'Desc 1',
                priority: 'high' as const,
                category: 'Security',
              },
            ],
          },
          {
            id: 'GAP-002',
            title: 'Gap 2',
            description: 'Description 2',
            severity: 'medium' as const,
            category: 'UI/UX',
            impact: 'Impact 2',
            suggestedRequirements: [],
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('1. **Gap 1**');
      expect(response.promptForLLM).toContain('2. **Gap 2**');
      expect(response.promptForLLM).toContain('GAP-001');
      expect(response.promptForLLM).toContain('GAP-002');
    });

    it('should include existing requirements section when provided', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        requirementsContent: '# Requirements\n\nREQ-001: Requirement',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Gap',
            description: 'Description',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Impact',
            suggestedRequirements: [],
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Current Functional Requirements');
      expect(response.promptForLLM).toContain('# Requirements');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Gap',
            description: 'Description',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Impact',
            suggestedRequirements: [],
          },
        ],
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
    it('should throw error when gaps array is empty', async () => {
      const input = {
        featureBrief: '# Feature Brief',
        identifiedGaps: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      await expect(tool.handleRequest(input)).rejects.toThrow(
        'Gap-based functional requirements tool requires identified gaps'
      );
    });

    it('should handle many gaps', async () => {
      const manyGaps = Array.from({ length: 20 }, (_, i) => ({
        id: `GAP-${String(i + 1).padStart(3, '0')}`,
        title: `Gap ${i + 1}`,
        description: `Description ${i + 1}`,
        severity: 'high' as const,
        category: 'Security',
        impact: `Impact ${i + 1}`,
        suggestedRequirements: [],
      }));

      const input = {
        featureBrief: '# Feature Brief',
        identifiedGaps: manyGaps,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
