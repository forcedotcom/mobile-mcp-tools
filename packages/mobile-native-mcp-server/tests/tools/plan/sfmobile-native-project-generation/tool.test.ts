/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SfmobileNativeProjectGenerationTool } from '../../../../src/tools/plan/sfmobile-native-project-generation/tool.js';

// Mock the constants module to provide consistent paths for snapshots
vi.mock('../../../../src/constants.js', () => ({
  MOBILE_SDK_TEMPLATES_PATH: './templates',
}));

describe('SfmobileNativeProjectGenerationTool', () => {
  let tool: SfmobileNativeProjectGenerationTool;

  beforeEach(() => {
    const mockServer = {
      registerTool: vi.fn(),
    };
    tool = new SfmobileNativeProjectGenerationTool(mockServer as any);
  });

  it('should have correct tool properties', () => {
    expect(tool.name).toBe('Salesforce Mobile Native Project Generation');
    expect(tool.title).toBe('Salesforce Mobile Native Project Generation Guide');
    expect(tool.toolId).toBe('sfmobile-native-project-generation');
    expect(tool.description).toBe(
      'Provides LLM instructions for generating a mobile app project from a selected template with OAuth configuration'
    );
  });

  it('should have input schema with required fields', () => {
    const schema = tool.inputSchema;
    expect(schema).toBeDefined();
    expect(schema.shape).toBeDefined();
    expect(schema.shape.selectedTemplate).toBeDefined();
    expect(schema.shape.projectName).toBeDefined();
    expect(schema.shape.platform).toBeDefined();
    expect(schema.shape.packageName).toBeDefined();
    expect(schema.shape.organization).toBeDefined();
    expect(schema.shape.connectedAppClientId).toBeDefined();
    expect(schema.shape.connectedAppCallbackUri).toBeDefined();
    expect(schema.shape.loginHost).toBeDefined();
  });

  it('should register with MCP server with correct annotations', () => {
    const mockServer = {
      registerTool: vi.fn(),
    };
    const mockAnnotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    const projectTool = new SfmobileNativeProjectGenerationTool(mockServer as any);

    projectTool.register(mockAnnotations);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'sfmobile-native-project-generation',
      expect.objectContaining({
        description: 'Provides LLM instructions for generating a mobile app project from a selected template with OAuth configuration',
        inputSchema: expect.any(Object),
        title: 'Salesforce Mobile Native Project Generation Guide',
      }),
      expect.any(Function)
    );
  });

  it('should generate guidance for iOS platform', async () => {
    const input = {
      selectedTemplate: 'MobileSyncExplorerSwift',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'testapp://oauth/callback',
      loginHost: 'https://test.salesforce.com',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should generate guidance for Android platform', async () => {
    const input = {
      selectedTemplate: 'MobileSyncExplorerKotlin',
      projectName: 'TestAndroidApp',
      platform: 'Android' as const,
      packageName: 'com.test.androidapp',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9android123',
      connectedAppCallbackUri: 'androidapp://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should handle optional loginHost parameter', async () => {
    const inputWithoutLoginHost = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'testapp://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(inputWithoutLoginHost);

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should include build validation integration', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'testapp://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should handle errors gracefully', async () => {
    // Mock the generateProjectGenerationGuidance to throw an error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMethod = (tool as any).generateProjectGenerationGuidance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateProjectGenerationGuidance = () => {
      throw new Error('Test error');
    };

    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'testapp://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Test error');

    // Restore original method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateProjectGenerationGuidance = originalMethod;
  });

  it('should extract URL scheme from callback URI for iOS', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'customscheme://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should extract URL scheme from callback URI for Android', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'Android' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'customscheme://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should handle missing callback URI with fallback scheme for iOS', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toContain('myapp');
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should handle missing callback URI with fallback scheme for Android', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'Android' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toContain('myapp');
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should handle Android platform with loginHost', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'Android' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'testapp://oauth/callback',
      loginHost: 'https://custom.salesforce.com',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toContain('oauthLoginDomain');
    expect(result.content[0].text).toContain('https://custom.salesforce.com');
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('should handle non-Error exception in error handling', async () => {
    // Mock the generateProjectGenerationGuidance to throw a non-Error object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalMethod = (tool as any).generateProjectGenerationGuidance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateProjectGenerationGuidance = () => {
      throw 'String error'; // Non-Error object
    };

    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: '3MVG9test123',
      connectedAppCallbackUri: 'testapp://oauth/callback',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error: Unknown error occurred');

    // Restore original method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tool as any).generateProjectGenerationGuidance = originalMethod;
  });

  it('should handle missing client ID and callback URI in verification commands', async () => {
    const input = {
      selectedTemplate: 'TestTemplate',
      projectName: 'TestApp',
      platform: 'iOS' as const,
      packageName: 'com.test.app',
      organization: 'Test Org',
      connectedAppClientId: undefined,
      connectedAppCallbackUri: undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toContain('CLIENT_ID');
    expect(result.content[0].text).toContain('CALLBACK');
    expect(result.content[0].text).toMatchSnapshot();
  });
});
