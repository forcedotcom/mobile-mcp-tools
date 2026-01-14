/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentNode } from '../../../src/workflow/nodes/deploymentNode.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { createTestState } from '../../utils/stateBuilders.js';

describe('DeploymentNode', () => {
  let node: DeploymentNode;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    node = new DeploymentNode(mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('deployApp');
    });

    it('should extend BaseNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new DeploymentNode();
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should return empty object', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      const result = node.execute(inputState);

      expect(result).toEqual({});
    });

    it('should log debug message', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        buildType: 'debug',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
      });

      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);
      const deploymentLog = debugLogs.find(log => log.message.includes('Deployment node executed'));
      expect(deploymentLog).toBeDefined();
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

      node.execute(inputState);

      expect(inputState.platform).toBe(originalPlatform);
      expect(inputState.projectPath).toBe(originalProjectPath);
      expect(inputState.buildType).toBe(originalBuildType);
    });

    it('should handle different platform states', () => {
      const iosState = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/ios',
        buildType: 'debug',
        targetDevice: 'iPhone 15',
        packageName: 'com.test.ios',
        projectName: 'iOSApp',
      });

      const androidState = createTestState({
        platform: 'Android',
        projectPath: '/path/to/android',
        buildType: 'release',
        targetDevice: 'Pixel 8',
        packageName: 'com.test.android',
        projectName: 'AndroidApp',
      });

      const iosResult = node.execute(iosState);
      const androidResult = node.execute(androidState);

      expect(iosResult).toEqual({});
      expect(androidResult).toEqual({});
    });

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

      const result1 = node.execute(state1);
      const result2 = node.execute(state2);

      expect(result1).toEqual({});
      expect(result2).toEqual({});
    });
  });
});
