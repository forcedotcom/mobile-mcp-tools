/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BaseTool } from '../../src/tools/native-capabilities/baseTool.js';

export interface ToolTestConfig {
  toolName: string;
  toolClass: new () => BaseTool;
  typeDefinitionPath: string;
}

export function setupToolTest(config: ToolTestConfig) {
  let server = new McpServer({ name: 'test-server', version: '1.0.0' });
  let annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
  let tool: BaseTool | undefined;

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    tool = new config.toolClass();
    vi.clearAllMocks();
  });

  return {
    server,
    annotations,
    tool,
    runCommonTests: () => {
      describe(`${config.toolName} Tool`, () => {
        it('should register the tool without throwing', () => {
          expect(() => tool?.register(server, annotations)).not.toThrow();
        });

        it('should read the correct type definition file', async () => {
          const readTypeDefinitionFileSpy = vi
            .spyOn(tool, 'readTypeDefinitionFile')
            .mockResolvedValue('');
          await tool?.['handleRequest']();
          expect(readTypeDefinitionFileSpy).toHaveBeenCalled();
        });

        it('should return content with type definitions', async () => {
          const mockTypeDefinitions = 'mock type definitions';
          const mockBaseCapability = 'mock base capability';
          const mockMobileCapabilities = 'mock mobile capabilities';
          vi.spyOn(tool, 'readTypeDefinitionFile').mockResolvedValue(mockTypeDefinitions);
          vi.spyOn(tool, 'readBaseCapability').mockResolvedValue(mockBaseCapability);
          vi.spyOn(tool, 'readMobileCapabilities').mockResolvedValue(mockMobileCapabilities);
          vi.spyOn(tool, 'createServiceGroundingText').mockReturnValue('mock grounding text');

          const result = await tool?.['handleRequest']();
          expect(result).toEqual({
            content: [
              {
                type: 'text',
                text: 'mock grounding text',
              },
            ],
          });
        });

        it('should handle errors when reading type definition file', async () => {
          const error = new Error('Failed to read file');
          vi.spyOn(tool, 'readTypeDefinitionFile').mockRejectedValue(error);

          const result = await tool?.['handleRequest']();
          expect(result).toEqual({
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: Unable to load ${config.toolName} type definitions.`,
              },
            ],
          });
        });

        it('should create properly formatted service grounding text', () => {
          const mockTypeDefinitions = 'interface TestService { method(): void; }';
          const mockBaseCapability = 'interface BaseCapability { id: string; }';
          const mockMobileCapabilities = 'interface MobileCapabilities { version: string; }';

          const result = tool.createServiceGroundingText(
            mockTypeDefinitions,
            mockBaseCapability,
            mockMobileCapabilities
          );

          // Check that the grounding text contains the expected sections
          expect(result).toContain(`# ${tool?.serviceName} Service Grounding Context`);
          expect(result).toContain('## Base Capability');
          expect(result).toContain('## Mobile Capabilities');
          expect(result).toContain(`## ${tool?.serviceName} Service API`);

          // Check for proper markdown formatting
          expect(result).toContain('```typescript');
          expect(result).toContain('```');

          // Check that the content is included
          expect(result).toContain(mockTypeDefinitions);
          expect(result).toContain(mockBaseCapability);
          expect(result).toContain(mockMobileCapabilities);
        });
      });
    },
  };
}
