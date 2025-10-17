/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeBuildTool } from '../../../../src/tools/plan/sfmobile-native-build/tool.js';
import { TempDirectoryManager } from '../../../../src/common.js';
import { MockFileSystemProvider } from '../../../utils/MockFileSystemProvider.js';

describe('SFMobileNativeBuildTool', () => {
  let tool: SFMobileNativeBuildTool;
  let mockServer: McpServer;
  let mockTempDirManager: TempDirectoryManager;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    const mockFs = new MockFileSystemProvider('/mock/temp');
    mockTempDirManager = new TempDirectoryManager(mockFs);
    tool = new SFMobileNativeBuildTool(mockServer, mockTempDirManager);
  });

  describe('Tool Metadata', () => {
    it('should have correct tool properties', () => {
      expect(tool.toolMetadata.toolId).toBe('sfmobile-native-build');
      expect(tool.toolMetadata.title).toBe('Salesforce Mobile App Build Tool');
      expect(tool.toolMetadata.description).toBe(
        'Guides LLM through the process of building a Salesforce mobile app with target platform'
      );
    });

    it('should have input schema with required fields', () => {
      const schema = tool.toolMetadata.inputSchema;
      expect(schema).toBeDefined();
      expect(schema.shape).toBeDefined();
      expect(schema.shape.platform).toBeDefined();
      expect(schema.shape.projectPath).toBeDefined();
      expect(schema.shape.projectName).toBeDefined();
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
        projectName: 'MyiOSApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const guidance = result.content[0].text;

      // Check that it includes restrictive context
      expect(guidance).toContain('Your ONLY Task');
      expect(guidance).toContain('DO NOT');

      // Check main title
      expect(guidance).toContain('Salesforce Mobile App Build Execution for iOS');

      // Check iOS build execution
      expect(guidance).toContain('Build Execution Steps');
      expect(guidance).toContain('cd /path/to/ios/project');
      expect(guidance).toContain('xcodebuild');
      expect(guidance).toContain('MyiOSApp.xcworkspace');
      expect(guidance).toContain('-scheme MyiOSApp');
      expect(guidance).toContain('exit code');
    });

    it('should include project path in iOS build guidance', async () => {
      const customPath = '/custom/ios/project/path';
      const input = {
        platform: 'iOS' as const,
        projectPath: customPath,
        projectName: 'CustomApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content[0].text).toContain(`cd ${customPath}`);
    });
  });

  describe('Android Build Guidance', () => {
    it('should generate Android build guidance', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/android/project',
        projectName: 'MyAndroidApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      const guidance = result.content[0].text;

      // Check that it includes restrictive context
      expect(guidance).toContain('Your ONLY Task');
      expect(guidance).toContain('DO NOT');

      // Check main title
      expect(guidance).toContain('Salesforce Mobile App Build Execution for Android');

      // Check Android build execution
      expect(guidance).toContain('Build Execution Steps');
      expect(guidance).toContain('cd /path/to/android/project');
      expect(guidance).toContain('./gradlew build');
      expect(guidance).toContain('exit code');
      expect(guidance).toContain('buildSuccessful');
      expect(guidance).toContain('buildOutputFilePath');
    });

    it('should include project path in Android build guidance', async () => {
      const customPath = '/custom/android/project/path';
      const input = {
        platform: 'Android' as const,
        projectPath: customPath,
        projectName: 'CustomAndroidApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content[0].text).toContain(`cd ${customPath}`);
    });
  });

  describe('Platform-Specific Commands', () => {
    it('should include platform-specific build commands', async () => {
      // Test iOS build command
      const iOSInput = {
        platform: 'iOS' as const,
        projectPath: '/ios/path',
        projectName: 'iOSTestApp',
        workflowStateData: { thread_id: 'test-123' },
      };
      const iOSResult = await tool.handleRequest(iOSInput);
      expect(iOSResult.content[0].text).toContain('xcodebuild');
      expect(iOSResult.content[0].text).toContain('iOSTestApp.xcworkspace');

      // Test Android build command
      const androidInput = {
        platform: 'Android' as const,
        projectPath: '/android/path',
        projectName: 'AndroidTestApp',
        workflowStateData: { thread_id: 'test-123' },
      };
      const androidResult = await tool.handleRequest(androidInput);
      expect(androidResult.content[0].text).toContain('./gradlew build');
    });

    it('should include proper formatting and structure', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/test/path',
        projectName: 'TestApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      const guidance = result.content[0].text;

      // Check that it has proper markdown structure
      expect(guidance).toContain('##');
      expect(guidance).toContain('```bash');
      expect(guidance).toContain('exit code');
      expect(guidance).toContain('STOP HERE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project path', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '',
        projectName: 'EmptyPathApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('cd ');
    });
  });
});
