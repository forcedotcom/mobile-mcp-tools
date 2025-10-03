/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeBuildTool } from '../../../../src/tools/plan/sfmobile-native-build/tool.js';

describe('SFMobileNativeBuildTool', () => {
  let tool: SFMobileNativeBuildTool;
  let mockServer: McpServer;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeBuildTool(mockServer);
  });

  describe('Tool Metadata', () => {
    it('should have correct tool properties', () => {
      expect(tool.toolMetadata.toolId).toBe('sfmobile-native-build');
      expect(tool.toolMetadata.title).toBe('Salesforce Mobile App Build Tool');
      expect(tool.toolMetadata.description).toBe(
        'Guides LLM through the process of building a Salesforce mobile app with target platform'
      );
    });

    it('should have input schema with required platform and projectPath fields', () => {
      const schema = tool.toolMetadata.inputSchema;
      expect(schema).toBeDefined();
      expect(schema.shape).toBeDefined();
      expect(schema.shape.platform).toBeDefined();
      expect(schema.shape.projectPath).toBeDefined();
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

  describe('iOS Build Guidance', () => {
    it('should generate iOS build guidance', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/ios/project',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const guidance = result.content[0].text;

      // Check that it includes agent context
      expect(guidance).toContain('You are a tech-adept agent acting on behalf of a user');

      // Check main title
      expect(guidance).toContain('Salesforce Mobile App Build Guidance for iOS');

      // Check iOS build execution
      expect(guidance).toContain('iOS Build Execution');
      expect(guidance).toContain('Navigate to the /path/to/ios/project directory');
      expect(guidance).toContain('xcodebuild -workspace');
      expect(guidance).toContain('<your-workspace>.xcworkspace');
      expect(guidance).toContain('<your-scheme>');
      expect(guidance).toContain('BUILD SUCCEEDED');
    });

    it('should include project path in iOS build guidance', async () => {
      const customPath = '/custom/ios/project/path';
      const input = {
        platform: 'iOS' as const,
        projectPath: customPath,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content[0].text).toContain(`Navigate to the ${customPath} directory`);
    });
  });

  describe('Android Build Guidance', () => {
    it('should generate Android build guidance', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/android/project',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const guidance = result.content[0].text;

      // Check that it includes agent context
      expect(guidance).toContain('You are a tech-adept agent acting on behalf of a user');

      // Check main title
      expect(guidance).toContain('Salesforce Mobile App Build Guidance for Android');

      // Check Android build execution
      expect(guidance).toContain('Android Build Execution');
      expect(guidance).toContain('Navigate to the /path/to/android/project directory');
      expect(guidance).toContain('./gradlew build');
      expect(guidance).toContain('BUILD SUCCESSFUL');
      expect(guidance).toContain('FAILURE:Build failed');
    });

    it('should include project path in Android build guidance', async () => {
      const customPath = '/custom/android/project/path';
      const input = {
        platform: 'Android' as const,
        projectPath: customPath,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content[0].text).toContain(`Navigate to the ${customPath} directory`);
    });
  });

  describe('Platform-Specific Commands', () => {
    it('should include platform-specific build commands', async () => {
      // Test iOS build command
      const iOSInput = {
        platform: 'iOS' as const,
        projectPath: '/ios/path',
        workflowStateData: { thread_id: 'test-123' },
      };
      const iOSResult = await tool.handleRequest(iOSInput);
      expect(iOSResult.content[0].text).toContain('xcodebuild -workspace');

      // Test Android build command
      const androidInput = {
        platform: 'Android' as const,
        projectPath: '/android/path',
        workflowStateData: { thread_id: 'test-123' },
      };
      const androidResult = await tool.handleRequest(androidInput);
      expect(androidResult.content[0].text).toContain('./gradlew build');
    });

    it('should include proper formatting and structure', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/test/path',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      const guidance = result.content[0].text;

      // Check that it has proper markdown structure
      expect(guidance).toContain('##');
      expect(guidance).toContain('```bash');
      expect(guidance).toContain('**BUILD SUCCEEDED**');
      expect(guidance).toContain('You are a tech-adept agent');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project path', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Navigate to the  directory');
    });
  });
});
