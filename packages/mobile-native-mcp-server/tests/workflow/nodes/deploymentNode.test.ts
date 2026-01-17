/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentNode } from '../../../src/workflow/nodes/deploymentNode.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { DEPLOYMENT_TOOL } from '../../../src/tools/run/sfmobile-native-deployment/metadata.js';

describe('DeploymentNode', () => {
  let node: DeploymentNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new DeploymentNode(mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('deployApp');
    });

    it('should extend AbstractToolNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should use provided tool executor', () => {
      expect(node['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default tool executor when none provided', () => {
      const nodeWithoutExecutor = new DeploymentNode(undefined, mockLogger);
      expect(nodeWithoutExecutor['toolExecutor']).toBeDefined();
      expect(nodeWithoutExecutor['toolExecutor']).not.toBe(mockToolExecutor);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new DeploymentNode(mockToolExecutor);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke deployment tool with correct tool metadata', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(DEPLOYMENT_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(DEPLOYMENT_TOOL.description);
    });

    it('should pass all required fields to deployment tool', () => {
      const testPlatform = 'iOS';
      const testProjectPath = '/Users/test/MyApp';
      const testBuildType = 'debug';
      const testTargetDevice = 'iPhone 15';
      const testPackageName = 'com.example.myapp';
      const testProjectName = 'MyApp';

      const inputState = createTestState({
        platform: testPlatform as 'iOS',
        projectPath: testProjectPath,
        buildType: testBuildType as 'debug',
        targetDevice: testTargetDevice,
        packageName: testPackageName,
        projectName: testProjectName,
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input).toBeDefined();
      expect(lastCall?.input.platform).toBe(testPlatform);
      expect(lastCall?.input.projectPath).toBe(testProjectPath);
      expect(lastCall?.input.buildType).toBe(testBuildType);
      expect(lastCall?.input.targetDevice).toBe(testTargetDevice);
      expect(lastCall?.input.packageName).toBe(testPackageName);
      expect(lastCall?.input.projectName).toBe(testProjectName);
    });

    it('should validate result against deployment result schema', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      expect(() => {
        node.execute(inputState);
      }).not.toThrow();
    });
  });

  describe('execute() - iOS Platform', () => {
    it('should handle iOS debug deployment', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/ContactListApp-iOS',
        buildType: 'debug',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.salesforce.contactlist',
        projectName: 'ContactListApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('iOS');
      expect(lastCall?.input.buildType).toBe('debug');
    });

    it('should handle iOS release deployment', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/MyApp',
        buildType: 'release',
        targetDevice: 'iPhone 15',
        packageName: 'com.example.myapp',
        projectName: 'MyApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('iOS');
      expect(lastCall?.input.buildType).toBe('release');
    });

    it('should handle iOS simulator deployment', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/MyApp',
        buildType: 'debug',
        targetDevice: 'iPhone 15 Simulator',
        packageName: 'com.example.myapp',
        projectName: 'MyApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.targetDevice).toContain('Simulator');
    });
  });

  describe('execute() - Android Platform', () => {
    it('should handle Android debug deployment', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectPath: '/home/dev/ContactListApp-Android',
        buildType: 'debug',
        targetDevice: 'Pixel 8',
        packageName: 'com.salesforce.contactlist',
        projectName: 'ContactListApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('Android');
      expect(lastCall?.input.buildType).toBe('debug');
    });

    it('should handle Android release deployment', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectPath: '/home/dev/MyApp',
        buildType: 'release',
        targetDevice: 'Pixel 8 Pro',
        packageName: 'com.example.myapp',
        projectName: 'MyApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('Android');
      expect(lastCall?.input.buildType).toBe('release');
    });

    it('should handle Android emulator deployment', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectPath: '/home/dev/MyApp',
        buildType: 'debug',
        targetDevice: 'Android Emulator',
        packageName: 'com.example.myapp',
        projectName: 'MyApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.targetDevice).toContain('Emulator');
    });
  });

  describe('execute() - Build Types', () => {
    it('should handle debug build type', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.buildType).toBe('debug');
    });

    it('should handle release build type', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'release',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.buildType).toBe('release');
    });
  });

  describe('execute() - Deployment Status Results', () => {
    it('should return successful deployment status', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      const expectedResult = {
        deploymentStatus: 'success',
      };

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, expectedResult);

      const result = node.execute(inputState);

      expect(result).toEqual(expectedResult);
    });

    it('should return failed deployment status', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      const expectedResult = {
        deploymentStatus: 'failed',
      };

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, expectedResult);

      const result = node.execute(inputState);

      expect(result).toEqual(expectedResult);
    });

    it('should handle deployment in progress status', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'deploying',
      });

      const result = node.execute(inputState);

      expect(result.deploymentStatus).toBe('deploying');
    });
  });

  describe('execute() - Return Value', () => {
    it('should return validated result from tool executor', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      const expectedResult = {
        deploymentStatus: 'success',
      };

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, expectedResult);

      const result = node.execute(inputState);

      expect(result).toEqual(expectedResult);
    });

    it('should return partial state object', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('execute() - Logging', () => {
    it('should log tool invocation details', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);

      const preExecutionLog = debugLogs.find(log =>
        log.message.includes('Interrupt data (pre-execution)')
      );
      expect(preExecutionLog).toBeDefined();
    });

    it('should log tool result', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const postExecutionLog = debugLogs.find(log =>
        log.message.includes('Tool execution result (post-execution)')
      );
      expect(postExecutionLog).toBeDefined();
    });
  });

  describe('execute() - State Independence', () => {
    it('should only use required fields from state', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        // Other state properties that should not be passed
        organization: 'TestOrg',
        loginHost: 'https://login.salesforce.com',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input).toHaveProperty('platform');
      expect(lastCall?.input).toHaveProperty('projectPath');
      expect(lastCall?.input).toHaveProperty('buildType');
      expect(lastCall?.input).toHaveProperty('targetDevice');
      expect(lastCall?.input).toHaveProperty('packageName');
      expect(lastCall?.input).toHaveProperty('projectName');
      expect(lastCall?.input).not.toHaveProperty('organization');
      expect(lastCall?.input).not.toHaveProperty('loginHost');
    });

    it('should not modify input state', () => {
      const originalPlatform = 'iOS';
      const originalProjectPath = '/path/to/project';
      const originalBuildType = 'debug';

      const inputState = createTestState({
        platform: originalPlatform as 'iOS',
        projectPath: originalProjectPath,
        buildType: originalBuildType as 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      expect(inputState.platform).toBe(originalPlatform);
      expect(inputState.projectPath).toBe(originalProjectPath);
      expect(inputState.buildType).toBe(originalBuildType);
    });
  });

  describe('execute() - Real World Scenarios', () => {
    it('should handle Contact List app iOS deployment', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/developer/ContactListApp-iOS',
        buildType: 'debug',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.salesforce.contactlist',
        projectName: 'ContactListApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('iOS');
      expect(lastCall?.input.projectName).toBe('ContactListApp');
      expect(lastCall?.llmMetadata.name).toBe('sfmobile-native-deployment');
    });

    it('should handle Contact List app Android deployment', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectPath: '/home/developer/ContactListApp-Android',
        buildType: 'debug',
        targetDevice: 'Pixel 8',
        packageName: 'com.salesforce.contactlist',
        projectName: 'ContactListApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('Android');
      expect(lastCall?.input.projectName).toBe('ContactListApp');
    });

    it('should handle deployment after successful build', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/MyApp',
        buildType: 'release',
        targetDevice: 'iPhone 15',
        packageName: 'com.example.myapp',
        projectName: 'MyApp',
        buildSuccessful: true,
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.platform).toBe('iOS');
      expect(lastCall?.input.buildType).toBe('release');
    });

    it('should handle deployment to physical device', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/Users/dev/MyApp',
        buildType: 'debug',
        targetDevice: "Kevin's iPhone 15 Pro",
        packageName: 'com.example.myapp',
        projectName: 'MyApp',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.targetDevice).toContain('iPhone 15 Pro');
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle package names with different formats', () => {
      const packageNames = [
        'com.company.app',
        'com.example.myapp.mobile',
        'org.salesforce.contactlist',
        'io.github.myproject',
      ];

      packageNames.forEach(packageName => {
        const inputState = createTestState({
          platform: 'iOS',
          projectPath: '/path/to/project',
          buildType: 'debug',
          targetDevice: 'iPhone 15',
          packageName,
          projectName: 'TestApp',
        });

        mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
          deploymentStatus: 'success',
        });

        node.execute(inputState);

        const lastCall = mockToolExecutor.getLastCall();
        expect(lastCall?.input.packageName).toBe(packageName);
      });
    });

    it('should handle project names with special characters', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app',
        projectName: 'My-App_v2.0',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.projectName).toBe('My-App_v2.0');
    });

    it('should handle different target device names', () => {
      const devices = [
        'iPhone 15 Pro Max',
        'iPad Pro 12.9"',
        'Pixel 8 Pro',
        'Samsung Galaxy S24',
        'Any iOS Device',
      ];

      devices.forEach(device => {
        const inputState = createTestState({
          platform: 'iOS',
          projectPath: '/path/to/project',
          buildType: 'debug',
          targetDevice: device,
          packageName: 'com.test.app',
          projectName: 'TestApp',
        });

        mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
          deploymentStatus: 'success',
        });

        node.execute(inputState);

        const lastCall = mockToolExecutor.getLastCall();
        expect(lastCall?.input.targetDevice).toBe(device);
      });
    });
  });

  describe('execute() - Multiple Invocations', () => {
    it('should handle multiple sequential invocations', () => {
      const state1 = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project1',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.app1',
        projectName: 'App1',
      });

      const state2 = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project2',
        buildType: 'release',
        targetDevice: 'Pixel 8',
        packageName: 'com.test.app2',
        projectName: 'App2',
      });

      mockToolExecutor.setResult(DEPLOYMENT_TOOL.toolId, {
        deploymentStatus: 'success',
      });

      node.execute(state1);
      const call1 = mockToolExecutor.getLastCall();

      node.execute(state2);
      const call2 = mockToolExecutor.getLastCall();

      expect(call1?.input.platform).toBe('iOS');
      expect(call1?.input.projectName).toBe('App1');
      expect(call2?.input.platform).toBe('Android');
      expect(call2?.input.projectName).toBe('App2');
    });
  });
});
