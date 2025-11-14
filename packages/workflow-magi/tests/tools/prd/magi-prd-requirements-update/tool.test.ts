/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MagiRequirementsUpdateTool } from '../../../../src/tools/prd/magi-prd-requirements-update/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('MagiRequirementsUpdateTool', () => {
  let tool: MagiRequirementsUpdateTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new MagiRequirementsUpdateTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('magi-prd-requirements-update');
      expect(tool.toolMetadata.title).toBe('Magi - Update Requirements');
      expect(tool.toolMetadata.description).toBe(
        'Updates the requirements file based on review feedback. Applies approved, rejected, and modification decisions to the requirements document.'
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
    it('should accept valid input with requirementsPath and reviewResult', () => {
      const validInput = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: ['REQ-001', 'REQ-002'],
          rejectedRequirementIds: ['REQ-003'],
          reviewSummary: 'Review completed',
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with modifications', () => {
      const validInput = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: ['REQ-001'],
          rejectedRequirementIds: [],
          modifications: [
            {
              requirementId: 'REQ-002',
              modificationReason: 'User requested changes',
              requestedChanges: {
                title: 'Updated title',
                description: 'Updated description',
              },
            },
          ],
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing requirementsPath', () => {
      const invalidInput = {
        reviewResult: {
          approvedRequirementIds: [],
          rejectedRequirementIds: [],
          reviewSummary: 'Review',
        },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing reviewResult', () => {
      const invalidInput = {
        requirementsPath: '/path/to/requirements.md',
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with updatedRequirementsContent', () => {
      const validResult = {
        updatedRequirementsContent: '# Requirements\n\nUpdated content',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should reject result missing updatedRequirementsContent', () => {
      const invalidResult = {};
      const result = tool.toolMetadata.resultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });
  });

  describe('Requirements Update Guidance Generation', () => {
    it('should generate guidance with requirements path and review result', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: ['REQ-001'],
          rejectedRequirementIds: ['REQ-002'],
          reviewSummary: 'Review completed',
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('requirements update tool');
      expect(response.promptForLLM).toContain('/path/to/requirements.md');
      expect(response.promptForLLM).toContain('REQ-001');
      expect(response.promptForLLM).toContain('REQ-002');
    });

    it('should include modification instructions when modifications are present', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: ['REQ-001'],
          rejectedRequirementIds: [],
          modifications: [
            {
              requirementId: 'REQ-002',
              modificationReason: 'User requested changes',
              requestedChanges: {
                title: 'Updated title',
              },
            },
          ],
          reviewSummary: 'Review with modifications',
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Modification Handling');
      expect(response.promptForLLM).toContain('REQ-002');
      expect(response.promptForLLM).toContain('User requested changes');
    });

    it('should include format preservation requirements', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: ['REQ-001'],
          rejectedRequirementIds: [],
          reviewSummary: 'Review',
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('CRITICAL REQUIREMENTS');
      expect(response.promptForLLM).toContain('STRICTLY PRESERVE EXISTING FORMAT');
    });

    it('should include workflow continuation instructions', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: ['REQ-001'],
          rejectedRequirementIds: [],
          reviewSummary: 'Review',
        },
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
    it('should handle empty review result arrays', async () => {
      const input = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: [],
          rejectedRequirementIds: [],
          reviewSummary: 'No changes',
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });

    it('should handle many approved and rejected requirements', async () => {
      const manyIds = Array.from({ length: 50 }, (_, i) => `REQ-${String(i + 1).padStart(3, '0')}`);
      const input = {
        requirementsPath: '/path/to/requirements.md',
        reviewResult: {
          approvedRequirementIds: manyIds.slice(0, 25),
          rejectedRequirementIds: manyIds.slice(25),
          reviewSummary: 'Large review',
        },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      expect(result.content).toBeDefined();
    });
  });
});

