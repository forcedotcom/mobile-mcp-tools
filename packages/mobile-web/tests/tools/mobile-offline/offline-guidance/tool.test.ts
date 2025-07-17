/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineGuidanceTool } from '../../../../src/tools/mobile-offline/offline-guidance/tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { ExpertCodeAnalysisIssuesSchema } from '../../../../src/schemas/analysisSchema.js';

describe('OfflineGuidanceTool', () => {
  let tool: OfflineGuidanceTool;
  let server: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    tool = new OfflineGuidanceTool();
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct tool properties', () => {
      expect(tool.name).toBe('Mobile Web Offline Guidance Tool');
      expect(tool.description).toContain('structured review instructions');
      expect(tool.description).toContain('Mobile Offline code violations');
      expect(tool.toolId).toBe('sfmobile-web-offline-guidance');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
    });

    it('should have a meaningful description', () => {
      expect(tool.description).toContain('Mobile Offline code violations');
      expect(tool.description).toContain('Lightning web components');
    });

    it('should require no input', () => {
      const inputShape = tool.inputSchema.shape;
      expect(Object.keys(inputShape)).toHaveLength(0);
    });
  });

  describe('Tool Registration', () => {
    it('should register the tool without throwing', () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      expect(() => tool.register(server, annotations)).not.toThrow();
      expect(registerToolSpy).toHaveBeenCalledWith(
        'sfmobile-web-offline-guidance',
        expect.objectContaining({
          description: tool.description,
          inputSchema: tool.inputSchema.shape,
          outputSchema: tool.outputSchema.shape,
          annotations: annotations,
        }),
        expect.any(Function)
      );
    });

    it('should register with correct tool ID', () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      expect(registerToolSpy).toHaveBeenCalledWith(
        'sfmobile-web-offline-guidance',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Expert Review Instructions', () => {
    it('should return expert review instructions', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      // Get the handler function that was passed to registerTool
      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;

      const result = await handler({});

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
      expect(result.structuredContent).toBeDefined();
    });

    it('should return structured content with review instructions', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;
      const result = await handler({});

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent).toHaveProperty('reviewInstructions');
      expect(result.structuredContent).toHaveProperty('orchestrationInstructions');
      expect(Array.isArray(result.structuredContent.reviewInstructions)).toBe(true);
      expect(result.structuredContent.reviewInstructions.length).toBeGreaterThan(0);
      expect(typeof result.structuredContent.orchestrationInstructions).toBe('string');
    });

    it('should include conditional rendering expert instructions', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;
      const result = await handler({});

      const reviewInstructions = result.structuredContent.reviewInstructions;
      const conditionalRenderingExpert = reviewInstructions.find(
        (expert: any) => expert.expertReviewerName === 'Conditional Rendering Compatibility Expert'
      );

      expect(conditionalRenderingExpert).toBeDefined();
      expect(conditionalRenderingExpert.supportedFileTypes).toEqual(['HTML']);
      expect(conditionalRenderingExpert.grounding).toContain(
        'Komaci offline static analysis engine'
      );
      expect(conditionalRenderingExpert.grounding).toContain('lwc:if, lwc:elseif, lwc:else');
      expect(conditionalRenderingExpert.request).toContain('lwc:if, lwc:elseif, and lwc:else');
      expect(conditionalRenderingExpert.request).toContain('if:true/if:false');
      expect(conditionalRenderingExpert.expectedResponseFormat).toHaveProperty('schema');
      expect(conditionalRenderingExpert.expectedResponseFormat).toHaveProperty('inputValues');
      expect(conditionalRenderingExpert.expectedResponseFormat.schema).toEqual(
        ExpertCodeAnalysisIssuesSchema.shape
      );
      expect(conditionalRenderingExpert.expectedResponseFormat.inputValues).toEqual({
        expertReviewerName: 'Conditional Rendering Compatibility Expert',
      });
    });

    it('should include GraphQL wire expert instructions', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;
      const result = await handler({});

      const reviewInstructions = result.structuredContent.reviewInstructions;
      const graphqlWireExpert = reviewInstructions.find(
        (expert: any) => expert.expertReviewerName === 'GraphQL Wire Configuration Expert'
      );

      expect(graphqlWireExpert).toBeDefined();
      expect(graphqlWireExpert.supportedFileTypes).toEqual(['JS']);
      expect(graphqlWireExpert.grounding).toContain('Komaci offline static analysis engine');
      expect(graphqlWireExpert.grounding).toContain('GraphQL queries');
      expect(graphqlWireExpert.request).toContain('@wire decorators');
      expect(graphqlWireExpert.request).toContain('getter methods');
      expect(graphqlWireExpert.expectedResponseFormat).toHaveProperty('schema');
      expect(graphqlWireExpert.expectedResponseFormat).toHaveProperty('inputValues');
      expect(graphqlWireExpert.expectedResponseFormat.schema).toEqual(
        ExpertCodeAnalysisIssuesSchema.shape
      );
      expect(graphqlWireExpert.expectedResponseFormat.inputValues).toEqual({
        expertReviewerName: 'GraphQL Wire Configuration Expert',
      });
    });

    it('should include proper orchestration instructions', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;
      const result = await handler({});

      const orchestrationInstructions = result.structuredContent.orchestrationInstructions;
      expect(orchestrationInstructions).toContain('sfmobile-web-offline-analysis');
      expect(orchestrationInstructions).toContain('Execute all review instructions');
      expect(orchestrationInstructions).toContain('Combine your review results');
    });

    it('should provide valid expectedResponseFormat schema structure', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      tool.register(server, annotations);

      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;
      const result = await handler({});

      const reviewInstructions = result.structuredContent.reviewInstructions;

      // Verify all experts have the new expectedResponseFormat structure
      reviewInstructions.forEach((expert: any) => {
        expect(expert.expectedResponseFormat).toHaveProperty('schema');
        expect(expert.expectedResponseFormat).toHaveProperty('inputValues');

        // Verify schema contains the correct structure
        expect(expert.expectedResponseFormat.schema).toEqual(ExpertCodeAnalysisIssuesSchema.shape);

        // Verify inputValues contains expertReviewerName
        expect(expert.expectedResponseFormat.inputValues).toHaveProperty('expertReviewerName');
        expect(typeof expert.expectedResponseFormat.inputValues.expertReviewerName).toBe('string');
        expect(expert.expectedResponseFormat.inputValues.expertReviewerName).toBe(
          expert.expertReviewerName
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const registerToolSpy = vi
        .spyOn(server, 'registerTool')
        .mockImplementation((_id, _config, handler) => {
          return {
            callback: handler,
            enabled: true,
            enable: vi.fn(),
            disable: vi.fn(),
            name: _id,
            description: '',
            inputSchema: _config.inputSchema,
            outputSchema: _config.outputSchema,
            annotations: _config.annotations,
            update: vi.fn(),
            remove: vi.fn(),
          };
        });

      // Mock an error in the tool execution
      const originalGetExpertReviewInstructions = tool['getExpertReviewInstructions'];
      tool['getExpertReviewInstructions'] = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      tool.register(server, annotations);

      const handler = registerToolSpy.mock.calls[0][2] as (input: {}) => Promise<any>;
      const result = await handler({});

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Failed to generate review instructions');
      expect(result.content[0].text).toContain('Test error');

      // Restore the original method
      tool['getExpertReviewInstructions'] = originalGetExpertReviewInstructions;
    });
  });
});
