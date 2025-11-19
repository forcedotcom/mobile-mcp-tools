/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeProjectGenerationTool } from '../../../../src/tools/plan/sfmobile-native-project-generation/tool.js';

describe('SFMobileNativeProjectGenerationTool', () => {
  let tool: SFMobileNativeProjectGenerationTool;
  let mockServer: McpServer;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeProjectGenerationTool(mockServer);
  });

  describe('Tool Metadata', () => {
    it('should have correct tool properties', () => {
      expect(tool.toolMetadata.toolId).toBe('sfmobile-native-project-generation');
      expect(tool.toolMetadata.title).toBe('Salesforce Mobile Native Project Generation');
      expect(tool.toolMetadata.description).toBe(
        'Provides LLM instructions for generating a mobile app project from a selected template with OAuth configuration'
      );
    });

    it('should have input schema with required fields', () => {
      const schema = tool.toolMetadata.inputSchema;
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

    it('should register without throwing errors', () => {
      const mockAnnotations = {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      };

      expect(() => tool.register(mockAnnotations)).not.toThrow();
    });
  });

  describe('iOS Project Generation Guidance', () => {
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
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      // Parse the structured workflow output
      const workflowOutput = JSON.parse(result.content[0].text as string);
      expect(workflowOutput).toHaveProperty('promptForLLM');
      expect(workflowOutput).toHaveProperty('resultSchema');

      // Verify the prompt contains expected iOS guidance content
      expect(workflowOutput.promptForLLM).toContain('Mobile App Project Generation Guide');
      expect(workflowOutput.promptForLLM).toContain('MobileSyncExplorerSwift');
      expect(workflowOutput.promptForLLM).toContain('iOS');
      expect(workflowOutput.promptForLLM).toContain('bootconfig.plist');
      expect(workflowOutput.promptForLLM).toContain('https://test.salesforce.com');

      // Verify the result schema defines projectPath
      const resultSchema = JSON.parse(workflowOutput.resultSchema);
      expect(resultSchema.type).toBe('object');
      expect(resultSchema.properties).toHaveProperty('projectPath');
      expect(resultSchema.properties.projectPath.type).toBe('string');
      expect(resultSchema.required).toContain('projectPath');
    });

    it('should include iOS-specific OAuth configuration', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerSwift',
        projectName: 'TestApp',
        platform: 'iOS' as const,
        packageName: 'com.test.app',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9test123',
        connectedAppCallbackUri: 'testapp://oauth/callback',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      // Verify CLI command includes OAuth parameters
      expect(workflowOutput.promptForLLM).toContain('--consumerkey="3MVG9test123"');
      expect(workflowOutput.promptForLLM).toContain('--callbackurl="testapp://oauth/callback"');
      expect(workflowOutput.promptForLLM).toContain('bootconfig.plist');
    });
  });

  describe('Android Project Generation Guidance', () => {
    it('should generate guidance for Android platform', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerKotlin',
        projectName: 'TestAndroidApp',
        platform: 'Android' as const,
        packageName: 'com.test.androidapp',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9android123',
        connectedAppCallbackUri: 'androidapp://oauth/callback',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      // Parse the structured workflow output
      const workflowOutput = JSON.parse(result.content[0].text as string);
      expect(workflowOutput).toHaveProperty('promptForLLM');
      expect(workflowOutput).toHaveProperty('resultSchema');

      // Verify the prompt contains expected Android guidance content
      expect(workflowOutput.promptForLLM).toContain('Mobile App Project Generation Guide');
      expect(workflowOutput.promptForLLM).toContain('MobileSyncExplorerKotlin');
      expect(workflowOutput.promptForLLM).toContain('Android');
      expect(workflowOutput.promptForLLM).toContain('bootconfig.plist');

      // Verify the result schema defines projectPath
      const resultSchema = JSON.parse(workflowOutput.resultSchema);
      expect(resultSchema.type).toBe('object');
      expect(resultSchema.properties).toHaveProperty('projectPath');
      expect(resultSchema.properties.projectPath.type).toBe('string');
      expect(resultSchema.required).toContain('projectPath');
    });

    it('should include Android-specific OAuth configuration', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerKotlin',
        projectName: 'TestAndroidApp',
        platform: 'Android' as const,
        packageName: 'com.test.androidapp',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9android123',
        connectedAppCallbackUri: 'androidapp://oauth/callback',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      // Verify CLI command includes OAuth parameters
      expect(workflowOutput.promptForLLM).toContain('--consumerkey="3MVG9android123"');
      expect(workflowOutput.promptForLLM).toContain('--callbackurl="androidapp://oauth/callback"');
      expect(workflowOutput.promptForLLM).toContain('bootconfig.plist');
    });
  });

  describe('Optional Parameters', () => {
    it('should handle optional loginHost parameter', async () => {
      const inputWithoutLoginHost = {
        selectedTemplate: 'MobileSyncExplorerSwift',
        projectName: 'TestApp',
        platform: 'iOS' as const,
        packageName: 'com.test.app',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9test123',
        connectedAppCallbackUri: 'testapp://oauth/callback',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(inputWithoutLoginHost);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      expect(workflowOutput.promptForLLM).toContain('Default (production)');
    });

    it('should include loginHost when provided', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerSwift',
        projectName: 'TestApp',
        platform: 'iOS' as const,
        packageName: 'com.test.app',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9test123',
        connectedAppCallbackUri: 'testapp://oauth/callback',
        loginHost: 'https://test.salesforce.com',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      expect(workflowOutput.promptForLLM).toContain('https://test.salesforce.com');
    });
  });

  describe('URL Scheme Extraction', () => {
    it('should extract URL scheme from callback URI for iOS', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerSwift',
        projectName: 'TestApp',
        platform: 'iOS' as const,
        packageName: 'com.test.app',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9test123',
        connectedAppCallbackUri: 'myapp://oauth/callback',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      // Verify CLI command includes the callback URI with the scheme
      expect(workflowOutput.promptForLLM).toContain('--callbackurl="myapp://oauth/callback"');
    });

    it('should extract URL scheme from callback URI for Android', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerKotlin',
        projectName: 'TestAndroidApp',
        platform: 'Android' as const,
        packageName: 'com.test.androidapp',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9android123',
        connectedAppCallbackUri: 'myapp://oauth/callback',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      // Verify CLI command includes the callback URI with the scheme
      expect(workflowOutput.promptForLLM).toContain('--callbackurl="myapp://oauth/callback"');
    });

    it('should handle missing callback URI with fallback scheme', async () => {
      const input = {
        selectedTemplate: 'MobileSyncExplorerSwift',
        projectName: 'TestApp',
        platform: 'iOS' as const,
        packageName: 'com.test.app',
        organization: 'Test Org',
        connectedAppClientId: '3MVG9test123',
        connectedAppCallbackUri: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const workflowOutput = JSON.parse(result.content[0].text as string);

      // Verify CLI command includes the empty callback URI
      expect(workflowOutput.promptForLLM).toContain('--callbackurl=""');
    });
  });
});
