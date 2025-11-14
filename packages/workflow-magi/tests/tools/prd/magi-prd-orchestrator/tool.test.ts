/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PRDGenerationOrchestrator } from '../../../../src/tools/prd/magi-prd-orchestrator/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('PRDGenerationOrchestrator', () => {
  let orchestrator: PRDGenerationOrchestrator;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    orchestrator = new PRDGenerationOrchestrator(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(orchestrator.toolMetadata.toolId).toBe('magi-prd-orchestrator');
      expect(orchestrator.toolMetadata.title).toBe('Magi - PRD Orchestrator');
      expect(orchestrator.toolMetadata.description).toBe(
        'Orchestrates the end-to-end workflow for generating Product Requirements Documents.'
      );
      expect(orchestrator.toolMetadata.inputSchema).toBeDefined();
      expect(orchestrator.toolMetadata.outputSchema).toBeDefined();
    });

    it('should register without throwing errors', () => {
      expect(() => orchestrator.register(annotations)).not.toThrow();
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with userInput', () => {
      const validInput = {
        userInput: { feature: 'test-feature' },
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = orchestrator.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input without userInput', () => {
      const validInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = orchestrator.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input with empty userInput', () => {
      const validInput = {
        userInput: {},
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = orchestrator.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Output Schema Validation', () => {
    it('should validate output with orchestrationInstructionsPrompt', () => {
      const validOutput = {
        orchestrationInstructionsPrompt: 'Next step instructions',
      };
      const result = orchestrator.toolMetadata.outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject output missing orchestrationInstructionsPrompt', () => {
      const invalidOutput = {};
      const result = orchestrator.toolMetadata.outputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('Orchestrator Configuration', () => {
    it('should be initialized with workflow configuration', () => {
      // The orchestrator wraps OrchestratorTool, so we can verify it's properly configured
      expect(orchestrator).toBeDefined();
      expect(orchestrator.toolMetadata).toBeDefined();
    });

    it('should have workflow state manager configured', () => {
      // Verify the orchestrator is properly initialized
      expect(orchestrator.register).toBeDefined();
      expect(typeof orchestrator.register).toBe('function');
    });
  });
});

