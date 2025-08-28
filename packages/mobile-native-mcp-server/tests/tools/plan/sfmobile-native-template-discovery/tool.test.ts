/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SfmobileNativeTemplateDiscoveryTool } from '../../../../src/tools/plan/sfmobile-native-template-discovery/tool.js';

describe('SfmobileNativeTemplateDiscoveryTool', () => {
  let tool: SfmobileNativeTemplateDiscoveryTool;

  beforeEach(() => {
    tool = new SfmobileNativeTemplateDiscoveryTool();
  });

  it('should have correct tool properties', () => {
    expect(tool.name).toBe('Salesforce Mobile Native Template Discovery');
    expect(tool.title).toBe('Salesforce Mobile Native Template Discovery Guide');
    expect(tool.toolId).toBe('sfmobile-native-template-discovery');
    expect(tool.description).toBe(
      'Guides LLM through template discovery and selection for Salesforce mobile app development'
    );
  });

  it('should have input schema with required platform field', () => {
    const schema = tool.inputSchema;
    expect(schema).toBeDefined();
    expect(schema.shape).toBeDefined();
    expect(schema.shape.platform).toBeDefined();
  });

  it('should register with MCP server', () => {
    const mockServer = {
      tool: vi.fn(),
    };
    const mockAnnotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };

    tool.register(
      mockServer as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer,
      mockAnnotations
    );

    expect(mockServer.tool).toHaveBeenCalledWith(
      'sfmobile-native-template-discovery',
      'Guides LLM through template discovery and selection for Salesforce mobile app development',
      expect.any(Object),
      expect.objectContaining({
        ...mockAnnotations,
        title: 'Salesforce Mobile Native Template Discovery Guide',
      }),
      expect.any(Function)
    );
  });

  it('should generate guidance for iOS platform', async () => {
    const input = { platform: 'iOS' as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Template Discovery Guidance for iOS');
    expect(result.content[0].text).toContain('Step 1: Plugin Verification');
    expect(result.content[0].text).toContain('sf plugins inspect sfdx-mobilesdk-plugin --json');
    expect(result.content[0].text).toContain(
      '**Version Requirements:** The plugin must be version 13.1.0 or greater'
    );
  });

  it('should generate guidance for Android platform', async () => {
    const input = { platform: 'Android' as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Template Discovery Guidance for Android');
    expect(result.content[0].text).toContain('sf mobilesdk android listtemplates');
  });

  it('should handle errors gracefully', async () => {
    // Mock the generateTemplateDiscoveryGuidance to throw an error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMethod = (tool as any).generateTemplateDiscoveryGuidance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateTemplateDiscoveryGuidance = () => {
      throw new Error('Test error');
    };

    const input = { platform: 'iOS' as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Test error');

    // Restore original method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateTemplateDiscoveryGuidance = originalMethod;
  });

  it('should handle non-Error exception in error handling', async () => {
    // Mock the generateTemplateDiscoveryGuidance to throw a non-Error object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMethod = (tool as any).generateTemplateDiscoveryGuidance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateTemplateDiscoveryGuidance = () => {
      throw 'String error'; // Non-Error object
    };

    const input = { platform: 'iOS' as const };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Unknown error occurred');

    // Restore original method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateTemplateDiscoveryGuidance = originalMethod;
  });
});
