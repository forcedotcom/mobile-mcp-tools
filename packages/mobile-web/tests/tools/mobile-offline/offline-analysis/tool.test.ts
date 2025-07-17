/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineAnalysisTool } from '../../../../src/tools/mobile-offline/offline-analysis/tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { LwcCodeType } from '../../../../src/schemas/lwcSchema.js';

describe('OfflineAnalysisTool', () => {
  let tool: OfflineAnalysisTool;
  let server: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    tool = new OfflineAnalysisTool();
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
      expect(tool.name).toBe('Mobile Web Offline Analysis Tool');
      expect(tool.description).toContain('Analyzes LWC components');
      expect(tool.toolId).toBe('sfmobile-web-offline-analysis');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
    });

    it('should have a meaningful description', () => {
      expect(tool.description).toContain('mobile-specific issues');
      expect(tool.description).toContain('mobile-ready');
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
        'sfmobile-web-offline-analysis',
        expect.objectContaining({
          description: tool.description,
          inputSchema: tool.inputSchema.shape,
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
        'sfmobile-web-offline-analysis',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Code Analysis', () => {
    const mockLwcCode: LwcCodeType = {
      name: 'TestComponent',
      namespace: 'c',
      jsMetaXml: {
        path: 'test.js-meta.xml',
        content: '',
      },
      js: [
        {
          path: 'test.js',
          content: `
            import { LightningElement, wire } from 'lwc';
            import getData from '@salesforce/apex/TestController.getData';
            
            export default class TestComponent extends LightningElement {
              @wire(getData, { param: '$privateProperty' })
              wiredData;
              
              privateProperty = 'test';
            }
          `,
        },
      ],
      html: [
        {
          path: 'test.html',
          content: '<template><div>Test</div></template>',
        },
      ],
      css: [
        {
          path: 'test.css',
          content: '.test { color: red; }',
        },
      ],
    };

    it('should analyze code and return results', async () => {
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
      const handler = registerToolSpy.mock.calls[0][2] as (
        code: LwcCodeType,
        extra: any
      ) => Promise<any>;

      const result = await handler(mockLwcCode, {
        server: server,
        request: {
          method: 'POST',
          url: '/api/v1/offline-analysis',
        },
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
      // MockLWC code has a private wire configuration property
      expect(result.content[0].text).toContain('Private Wire Configuration Property');
    });
  });

  describe('Private Methods (via public interface)', () => {
    it('should initialize rule reviewers correctly', () => {
      // Access private method through reflection or test its effects
      const toolInstance = new OfflineAnalysisTool();

      // The tool should be properly initialized
      expect(toolInstance).toBeDefined();
      expect(toolInstance.name).toBe('Mobile Web Offline Analysis Tool');
    });

    it('should have orchestration instructions', () => {
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
      const handler = registerToolSpy.mock.calls[0][2] as (
        code: LwcCodeType,
        extra
      ) => Promise<any>;

      // Test with a simple code sample
      const simpleCode: LwcCodeType = {
        name: 'SimpleComponent',
        namespace: 'c',
        jsMetaXml: {
          path: 'test.js-meta.xml',
          content: '',
        },
        js: [{ path: 'test.js', content: 'export default class SimpleComponent {}' }],
        html: [{ path: 'test.html', content: '<template></template>' }],
        css: [{ path: 'test.css', content: '' }],
      };

      return handler(simpleCode, {
        server: server,
        request: {
          method: 'POST',
          url: '/api/v1/offline-analysis',
        },
      }).then((result: any) => {
        expect(result.content[0].text).toContain('orchestrationInstructions');
        expect(result.content[0].text).toContain('sfmobile-web-offline-guidance');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid code gracefully', async () => {
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
      const handler = registerToolSpy.mock.calls[0][2] as (
        code: LwcCodeType,
        extra
      ) => Promise<any>;

      const invalidCode: LwcCodeType = {
        name: 'InvalidComponent',
        namespace: 'c',
        jsMetaXml: {
          path: 'test.js-meta.xml',
          content: '',
        },
        js: [{ path: 'test.js', content: 'invalid javascript syntax {[' }],
        html: [{ path: 'test.html', content: '<template></template>' }],
        css: [{ path: 'test.css', content: '' }],
      };

      const result = await handler(invalidCode, {
        server: server,
        request: {
          method: 'POST',
          url: '/api/v1/offline-analysis',
        },
      });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle empty code arrays', async () => {
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
      const handler = registerToolSpy.mock.calls[0][2] as (
        code: LwcCodeType,
        extra
      ) => Promise<any>;

      const emptyCode: LwcCodeType = {
        name: 'EmptyComponent',
        namespace: 'c',
        jsMetaXml: {
          path: 'test.js-meta.xml',
          content: '',
        },
        js: [],
        html: [],
        css: [],
      };

      const result = await handler(emptyCode, {
        server: server,
        request: {
          method: 'POST',
          url: '/api/v1/offline-analysis',
        },
      });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle code analysis errors and return the error as text', async () => {
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
      const handler = registerToolSpy.mock.calls[0][2] as (
        code: LwcCodeType,
        extra
      ) => Promise<any>;

      // Mock the analyzeCode method to throw an error
      vi.spyOn(tool, 'analyzeCode').mockRejectedValue(new Error('Analysis failed'));

      const testCode: LwcCodeType = {
        name: 'TestComponent',
        namespace: 'c',
        jsMetaXml: {
          path: 'test.js-meta.xml',
          content: '',
        },
        js: [{ path: 'test.js', content: 'export default class TestComponent {}' }],
        html: [{ path: 'test.html', content: '<template></template>' }],
        css: [{ path: 'test.css', content: '' }],
      };

      // This should throw an error with the proper error message format
      const result = await handler(testCode, {
        server: server,
        request: {
          method: 'POST',
          url: '/api/v1/offline-analysis',
        },
      });
      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Failed to analyze code: Analysis failed');
    });
  });

  describe('Tool Integration', () => {
    it('should work with the test helper pattern', () => {
      // This test ensures the tool can be used with the existing test helper pattern
      expect(() => new OfflineAnalysisTool()).not.toThrow();

      const testTool = new OfflineAnalysisTool();
      expect(testTool).toBeInstanceOf(OfflineAnalysisTool);
      expect(testTool.name).toBe('Mobile Web Offline Analysis Tool');
    });
  });
});
