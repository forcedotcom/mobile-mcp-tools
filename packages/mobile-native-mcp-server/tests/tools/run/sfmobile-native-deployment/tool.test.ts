/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SfmobileNativeDeploymentTool } from '../../../../src/tools/run/sfmobile-native-deployment/tool.js';

describe('SfmobileNativeDeploymentTool', () => {
  let tool: SfmobileNativeDeploymentTool;

  beforeEach(() => {
    tool = new SfmobileNativeDeploymentTool();
  });

  it('should have correct tool properties', () => {
    expect(tool.name).toBe('Salesforce Mobile Native Deployment');
    expect(tool.title).toBe('Salesforce Mobile Native Deployment Guide');
    expect(tool.toolId).toBe('sfmobile-native-deployment');
    expect(tool.description).toBe(
      'Guides LLM through deploying Salesforce mobile native apps to devices or simulators'
    );
  });

  it('should have input schema with required fields', () => {
    const schema = tool.inputSchema;
    expect(schema).toBeDefined();
    expect(schema.shape).toBeDefined();
    expect(schema.shape.platform).toBeDefined();
    expect(schema.shape.projectPath).toBeDefined();
    expect(schema.shape.buildType).toBeDefined();
    expect(schema.shape.targetDevice).toBeDefined();
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
      'sfmobile-native-deployment',
      'Guides LLM through deploying Salesforce mobile native apps to devices or simulators',
      expect.any(Object),
      expect.objectContaining({
        ...mockAnnotations,
        title: 'Salesforce Mobile Native Deployment Guide',
      }),
      expect.any(Function)
    );
  });

  describe('iOS deployment guidance', () => {
    it('should generate guidance for iOS with debug build', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'iPhone-15-Pro',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for iOS');
      expect(result.content[0].text).toContain('Step 1: iOS Simulator must be ready');
      expect(result.content[0].text).toContain('Step 2: Deploy application to iOS Simulator');
      expect(result.content[0].text).toContain('xcrun simctl list devices | grep "iPhone-15-Pro"');
      expect(result.content[0].text).toContain('xcrun simctl boot iPhone-15-Pro');
      expect(result.content[0].text).toContain('xcrun simctl install iPhone-15-Pro <your-app>.app');
      expect(result.content[0].text).toContain('xcrun simctl launch iPhone-15-Pro <app-bundle-id>');
    });

    it('should generate guidance for iOS with release build', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'release' as const,
        targetDevice: 'iPhone-15-Pro',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for iOS');
    });

    it('should generate guidance for iOS without target device', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for iOS');
    });
  });

  describe('Android deployment guidance', () => {
    it('should generate guidance for Android with debug build', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'pixel-34',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for Android');
      expect(result.content[0].text).toContain('Step 1: Android Emulator must be ready');
      expect(result.content[0].text).toContain('Step 2: Deploy application to Android Emulator');
      expect(result.content[0].text).toContain('sf force lightning local device list -p android');
      expect(result.content[0].text).toContain('sf force lightning local device create -p android');
      expect(result.content[0].text).toContain('sf force lightning local device start -p android');
      expect(result.content[0].text).toContain('./gradlew installDebug');
      expect(result.content[0].text).toContain('adb shell monkey -p <application-id>');
    });

    it('should generate guidance for Android with release build', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'release' as const,
        targetDevice: 'pixel-34',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for Android');
      expect(result.content[0].text).toContain('./gradlew installRelease');
    });

    it('should generate guidance for Android without target device', async () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for Android');
    });
  });

  describe('input validation', () => {
    it('should apply default buildType when not provided', async () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mobile Native App Deployment Guidance for iOS');
    });

    it('should handle invalid platform gracefully', async () => {
      const input = {
        platform: 'InvalidPlatform',
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle missing required fields', async () => {
      const input = {
        platform: 'iOS' as const,
        // Missing projectPath
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock the generateDeploymentGuidance to throw an error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalMethod = (tool as any).generateDeploymentGuidance;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tool as any).generateDeploymentGuidance = () => {
        throw new Error('Test error');
      };

      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Test error');

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tool as any).generateDeploymentGuidance = originalMethod;
    });

    it('should handle unknown errors', async () => {
      // Mock the generateDeploymentGuidance to throw a non-Error object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalMethod = (tool as any).generateDeploymentGuidance;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tool as any).generateDeploymentGuidance = () => {
        throw 'String error';
      };

      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Unknown error occurred');

      // Restore original method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tool as any).generateDeploymentGuidance = originalMethod;
    });
  });

  describe('private method testing', () => {
    it('should generate correct iOS target device ready step', () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'iPhone-15-Pro',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateTargetDeviceReadyStep(1, input);

      expect(result).toContain('Step 1: iOS Simulator must be ready');
      expect(result).toContain('xcrun simctl list devices | grep "iPhone-15-Pro"');
      expect(result).toContain('xcrun simctl boot iPhone-15-Pro');
    });

    it('should generate correct Android target device ready step', () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'pixel-34',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateTargetDeviceReadyStep(1, input);

      expect(result).toContain('Step 1: Android Emulator must be ready');
      expect(result).toContain('sf force lightning local device list -p android');
      expect(result).toContain('sf force lightning local device create -p android');
    });

    it('should generate correct deployment step', () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'iPhone-15-Pro',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateDeploymentStep(2, input);

      expect(result).toContain('Step 2: Deploy application to iOS Simulator');
      expect(result).toContain('xcrun simctl install iPhone-15-Pro <your-app>.app');
    });

    it('should generate correct iOS deployment command', () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'iPhone-15-Pro',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateDeploymentCommand(input);

      expect(result).toContain('xcrun simctl install iPhone-15-Pro <your-app>.app');
      expect(result).toContain('Replace <your-app>.app with app name built in');
    });

    it('should generate correct Android deployment command for debug', () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'pixel-34',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateDeploymentCommand(input);

      expect(result).toContain('./gradlew installDebug');
    });

    it('should generate correct Android deployment command for release', () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'release' as const,
        targetDevice: 'pixel-34',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateDeploymentCommand(input);

      expect(result).toContain('./gradlew installRelease');
    });

    it('should generate correct iOS launch command', () => {
      const input = {
        platform: 'iOS' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'iPhone-15-Pro',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateLaunchCommand(input);

      expect(result).toContain('xcrun simctl launch iPhone-15-Pro <app-bundle-id>');
      expect(result).toContain('Replace <app-bundle-id> with the bundle id of the app');
    });

    it('should generate correct Android launch command', () => {
      const input = {
        platform: 'Android' as const,
        projectPath: '/path/to/project',
        buildType: 'debug' as const,
        targetDevice: 'pixel-34',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (tool as any).generateLaunchCommand(input);

      expect(result).toContain('adb shell monkey -p <application-id>');
      expect(result).toContain('Replace <application-id> with the value of applicationId');
    });
  });
});
