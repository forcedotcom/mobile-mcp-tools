/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiGapRequirementsTool } from '../../../../../src/tools/magi/prd/magi-prd-gap-requirements/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiGapRequirementsTool', () => {
  let tool: MagiGapRequirementsTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiGapRequirementsTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-gap-requirements');
      expect(tool.toolMetadata.title).toBe('Magi - Generate Requirements from Identified Gaps');
      expect(tool.toolMetadata.description).toBe(
        'Analyzes identified gaps to propose additional functional requirements that address the gaps'
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
    it('should accept valid input with gaps and requirements', () => {
      const validInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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

    it('should reject input missing featureBriefPath', () => {
      const invalidInput = {
        requirementsPath: '/path/to/requirements.md',
        identifiedGaps: [],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing identifiedGaps', () => {
      const invalidInput = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with updated requirements markdown', () => {
      const validResult = {
        updatedRequirementsMarkdown:
          '# Requirements\n\n## Status\n**Status**: draft\n\n## Pending Review Requirements\n\n### REQ-001: Requirement\n- **Priority**: high\n- **Category**: Security\n- **Description**: Description',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing updatedRequirementsMarkdown', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Gap Requirements Guidance Generation', () => {
    it('should generate guidance with gaps and requirements paths', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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
      expect(response.promptForLLM).toContain('File Path');
      expect(response.promptForLLM).toContain('/path/to/feature-brief.md');
      expect(response.promptForLLM).toContain('/path/to/requirements.md');
      expect(response.promptForLLM).toContain('GAP-001');
    });

    it('should format gaps list correctly', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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

    it('should include requirement filtering instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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

      expect(response.promptForLLM).toContain('approved requirements');
      expect(response.promptForLLM).toContain('modified requirements');
      expect(response.promptForLLM).toContain('Ignore');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
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
    it('should handle empty gaps array', async () => {
      const input = {
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        identifiedGaps: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
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
        featureBriefPath: '/path/to/feature-brief.md',
        requirementsPath: '/path/to/requirements.md',
        identifiedGaps: manyGaps,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});
