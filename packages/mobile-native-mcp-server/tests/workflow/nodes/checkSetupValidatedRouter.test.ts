/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckSetupValidatedRouter } from '../../../src/workflow/nodes/checkSetupValidatedRouter.js';
import { createTestState } from '../../utils/stateBuilders.js';

describe('CheckSetupValidatedRouter', () => {
  const setupValidatedNodeName = 'templateDiscovery';
  const androidSetupNodeName = 'getAndroidSetup';
  const invalidSetupNodeName = 'failure';
  let router: CheckSetupValidatedRouter;

  beforeEach(() => {
    router = new CheckSetupValidatedRouter(
      setupValidatedNodeName,
      androidSetupNodeName,
      invalidSetupNodeName
    );
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router).toBeDefined();
    });

    it('should accept different node names', () => {
      const customRouter = new CheckSetupValidatedRouter('node1', 'node2', 'node3');
      expect(customRouter).toBeDefined();
    });
  });

  describe('execute() - Valid platform setup', () => {
    it('should route to setupValidated node when validPlatformSetup is true', () => {
      const inputState = createTestState({
        platform: 'iOS',
        validPlatformSetup: true,
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });

    it('should route to setupValidated node for iOS with true setup', () => {
      const inputState = createTestState({
        platform: 'iOS',
        validPlatformSetup: true,
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });

    it('should route to setupValidated node for Android with true setup and valid paths', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: true,
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });

    it('should route to setupValidated node for Android with true setup even without paths', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: true,
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });
  });

  describe('execute() - Android platform without paths', () => {
    it('should route to androidSetup node for Android with false setup and missing both paths', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: undefined,
        java_home: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });

    it('should route to androidSetup node for Android with false setup and missing android_home', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: undefined,
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });

    it('should route to androidSetup node for Android with false setup and missing java_home', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: '/path/to/android',
        java_home: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });

    it('should route to androidSetup node for Android with false setup and empty string paths', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: '',
        java_home: '',
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });

    it('should route to androidSetup node for Android with false setup and null paths', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: null as unknown as string,
        java_home: null as unknown as string,
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });
  });

  describe('execute() - Android platform with paths present', () => {
    it('should route to failure node for Android with false setup but both paths present', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
    });

    it('should route to failure node when setup is false but paths were already tried', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: '/invalid/android',
        java_home: '/invalid/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
    });
  });

  describe('execute() - iOS platform invalid setup', () => {
    it('should route to failure node for iOS with invalid setup', () => {
      const inputState = createTestState({
        platform: 'iOS',
        validPlatformSetup: false,
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
    });

    it('should not trigger Android recovery for iOS', () => {
      const inputState = createTestState({
        platform: 'iOS',
        validPlatformSetup: false,
        android_home: undefined,
        java_home: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
      expect(result).not.toBe(androidSetupNodeName);
    });
  });

  describe('execute() - Edge cases', () => {
    it('should handle undefined platform', () => {
      const inputState = createTestState({
        platform: undefined,
        validPlatformSetup: false,
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
    });

    it('should handle undefined validPlatformSetup as false', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });

    it('should not modify input state', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
      });

      const originalPlatform = inputState.platform;
      const originalValidSetup = inputState.validPlatformSetup;

      router.execute(inputState);

      expect(inputState.platform).toBe(originalPlatform);
      expect(inputState.validPlatformSetup).toBe(originalValidSetup);
    });

    it('should produce consistent results for same state', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
      });

      const result1 = router.execute(inputState);
      const result2 = router.execute(inputState);

      expect(result1).toBe(result2);
    });
  });

  describe('execute() - Decision logic flow', () => {
    it('should prioritize validPlatformSetup over platform type', () => {
      const androidState = createTestState({
        platform: 'Android',
        validPlatformSetup: true,
      });

      const iosState = createTestState({
        platform: 'iOS',
        validPlatformSetup: true,
      });

      const androidResult = router.execute(androidState);
      const iosResult = router.execute(iosState);

      expect(androidResult).toBe(setupValidatedNodeName);
      expect(iosResult).toBe(setupValidatedNodeName);
    });

    it('should only check Android paths when validPlatformSetup is false and platform is Android', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: '/path',
        java_home: '/path',
      });

      const result = router.execute(inputState);

      // Paths are present, so should go to failure not android setup
      expect(result).toBe(invalidSetupNodeName);
    });
  });

  describe('execute() - Multiple invocations', () => {
    it('should handle sequential calls with different states', () => {
      const state1 = createTestState({
        platform: 'iOS',
        validPlatformSetup: true,
      });

      const state2 = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(setupValidatedNodeName);
      expect(result2).toBe(androidSetupNodeName);
    });

    it('should maintain independence across invocations', () => {
      const successState = createTestState({
        platform: 'Android',
        validPlatformSetup: true,
      });

      const recoveryState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
      });

      router.execute(successState);
      const result = router.execute(recoveryState);

      expect(result).toBe(androidSetupNodeName);
    });
  });

  describe('execute() - State with other properties', () => {
    it('should ignore other state properties', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: true,
        projectName: 'TestProject',
        packageName: 'com.test.app',
        organization: 'TestOrg',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });

    it('should only depend on validPlatformSetup, platform, android_home, and java_home', () => {
      const state1 = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: undefined,
        projectName: 'Project1',
      });

      const state2 = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: undefined,
        projectName: 'Project2',
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(result2);
      expect(result1).toBe(androidSetupNodeName);
    });
  });

  describe('execute() - Real-world scenarios', () => {
    it('should handle typical iOS success path', () => {
      const inputState = createTestState({
        platform: 'iOS',
        validPlatformSetup: true,
        validEnvironment: true,
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });

    it('should handle typical Android success path with env vars already set', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: true,
        android_home: '/Users/test/Library/Android/sdk',
        java_home: '/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupValidatedNodeName);
    });

    it('should handle Android recovery path when env vars not configured', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: undefined,
        java_home: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(androidSetupNodeName);
    });

    it('should handle iOS failure with missing Xcode', () => {
      const inputState = createTestState({
        platform: 'iOS',
        validPlatformSetup: false,
        workflowFatalErrorMessages: ['Xcode is not installed'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
    });

    it('should handle Android failure after recovery attempt', () => {
      const inputState = createTestState({
        platform: 'Android',
        validPlatformSetup: false,
        android_home: '/path/to/android',
        java_home: '/path/to/java',
        workflowFatalErrorMessages: ['Android SDK version mismatch'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(invalidSetupNodeName);
    });
  });
});
