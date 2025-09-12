/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SfmobileNativeBuildTool } from '../../../../src/tools/plan/sfmobile-native-build/tool.js';

describe('SfmobileNativeBuildTool', () => {
  let tool: SfmobileNativeBuildTool;

  beforeEach(() => {
    const mockServer = {
      registerTool: vi.fn(),
    };
    tool = new SfmobileNativeBuildTool(mockServer as any);
  });

  it('should have correct tool properties', () => {
    expect(tool.name).toBe('Salesforce Mobile App Build Tool');
    expect(tool.title).toBe('Salesforce Mobile app build guide');
    expect(tool.toolId).toBe('sfmobile-native-build');
    expect(tool.description).toBe(
      'Guides LLM through the process of building a Salesforce mobile app with target platform'
    );
  });

  it('should have input schema with required platform and projectPath fields', () => {
    const schema = tool.inputSchema;
    expect(schema).toBeDefined();
    expect(schema.shape).toBeDefined();
    expect(schema.shape.platform).toBeDefined();
    expect(schema.shape.projectPath).toBeDefined();
  });

  it('should register with MCP server using registerTool', () => {
    const mockServer = {
      registerTool: vi.fn(),
    };
    const mockAnnotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    const buildTool = new SfmobileNativeBuildTool(mockServer as any);

    buildTool.register(mockAnnotations);

    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'sfmobile-native-build',
      expect.objectContaining({
        description: 'Guides LLM through the process of building a Salesforce mobile app with target platform',
        inputSchema: expect.any(Object),
        title: 'Salesforce Mobile app build guide',
      }),
      expect.any(Function)
    );
  });

  it('should support workflow operations', () => {
    // All tools now support workflow by default - no separate property needed
    expect(tool).toBeDefined();
  });

  it('should generate iOS build guidance', async () => {
    const input = { platform: 'iOS' as const, projectPath: '/path/to/ios/project' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

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
    expect(guidance).toContain('<simulator-destination>');
    expect(guidance).toContain('BUILD SUCCEEDED');
    expect(guidance).toContain('iOS 17.0 or greater');
  });

  it('should generate Android build guidance', async () => {
    const input = { platform: 'Android' as const, projectPath: '/path/to/android/project' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

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

  it('should include project path in iOS build guidance', async () => {
    const customPath = '/custom/ios/project/path';
    const input = { platform: 'iOS' as const, projectPath: customPath };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toContain(`Navigate to the ${customPath} directory`);
  });

  it('should include project path in Android build guidance', async () => {
    const customPath = '/custom/android/project/path';
    const input = { platform: 'Android' as const, projectPath: customPath };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content[0].text).toContain(`Navigate to the ${customPath} directory`);
  });

  it('should include platform-specific build commands', async () => {
    // Test iOS build command
    const iOSInput = { platform: 'iOS' as const, projectPath: '/ios/path' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iOSResult = await (tool as any).handleRequest(iOSInput);
    expect(iOSResult.content[0].text).toContain('xcodebuild -workspace');

    // Test Android build command
    const androidInput = { platform: 'Android' as const, projectPath: '/android/path' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const androidResult = await (tool as any).handleRequest(androidInput);
    expect(androidResult.content[0].text).toContain('./gradlew build');
  });

  it('should include proper formatting and structure', async () => {
    const input = { platform: 'iOS' as const, projectPath: '/test/path' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    const guidance = result.content[0].text;

    // Check that it has proper markdown structure
    expect(guidance).toContain('##');
    expect(guidance).toContain('```bash');
    expect(guidance).toContain('**BUILD SUCCEEDED**');
    expect(guidance).toContain('You are a tech-adept agent');
  });

  it('should handle empty project path', async () => {
    const input = { platform: 'Android' as const, projectPath: '' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).handleRequest(input);

    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('Navigate to the  directory');
  });

  it('should test individual method behaviors', () => {
    // Test msdkAppBuildExecutionIOS method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iOSBuildResult = (tool as any).msdkAppBuildExecutionIOS('/test/path');
    expect(iOSBuildResult).toContain('iOS Build Execution');
    expect(iOSBuildResult).toContain('/test/path');
    expect(iOSBuildResult).toContain('xcodebuild');

    // Test msdkAppBuildExecutionAndroid method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const androidBuildResult = (tool as any).msdkAppBuildExecutionAndroid('/android/path');
    expect(androidBuildResult).toContain('Android Build Execution');
    expect(androidBuildResult).toContain('/android/path');
    expect(androidBuildResult).toContain('./gradlew build');
  });
});
