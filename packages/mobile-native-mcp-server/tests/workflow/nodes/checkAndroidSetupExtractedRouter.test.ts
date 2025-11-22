/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckAndroidSetupExtractedRouter } from '../../../src/workflow/nodes/checkAndroidSetupExtractedRouter.js';
import { createTestState } from '../../utils/stateBuilders.js';

describe('CheckAndroidSetupExtractedRouter', () => {
  const setupExtractedNodeName = 'platformCheck';
  const failureNodeName = 'failure';
  let router: CheckAndroidSetupExtractedRouter;

  beforeEach(() => {
    router = new CheckAndroidSetupExtractedRouter(setupExtractedNodeName, failureNodeName);
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router).toBeDefined();
    });

    it('should accept different node names', () => {
      const customRouter = new CheckAndroidSetupExtractedRouter('customSuccess', 'customFailure');
      expect(customRouter).toBeDefined();
    });
  });

  describe('execute() - Both paths present', () => {
    it('should route to setup extracted node when both android_home and java_home are present', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });

    it('should route to setup extracted node with different paths', () => {
      const inputState = createTestState({
        android_home: '/different/android/path',
        java_home: '/different/java/path',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });

    it('should route to setup extracted node with paths containing special characters', () => {
      const inputState = createTestState({
        android_home: '/path-with_special/chars/android',
        java_home: '/path-with_special/chars/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });
  });

  describe('execute() - Missing android_home', () => {
    it('should route to failure node when android_home is undefined', () => {
      const inputState = createTestState({
        android_home: undefined,
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when android_home is empty string', () => {
      const inputState = createTestState({
        android_home: '',
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when android_home is null', () => {
      const inputState = createTestState({
        android_home: null as unknown as string,
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Missing java_home', () => {
    it('should route to failure node when java_home is undefined', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when java_home is empty string', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: '',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when java_home is null', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: null as unknown as string,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Both missing', () => {
    it('should route to failure node when both are undefined', () => {
      const inputState = createTestState({
        android_home: undefined,
        java_home: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when both are empty strings', () => {
      const inputState = createTestState({
        android_home: '',
        java_home: '',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when both are null', () => {
      const inputState = createTestState({
        android_home: null as unknown as string,
        java_home: null as unknown as string,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when state has no android properties', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Edge cases', () => {
    it('should handle state with only android_home', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle state with only java_home', () => {
      const inputState = createTestState({
        java_home: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should not modify input state', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const originalAndroidHome = inputState.android_home;
      const originalJavaHome = inputState.java_home;

      router.execute(inputState);

      expect(inputState.android_home).toBe(originalAndroidHome);
      expect(inputState.java_home).toBe(originalJavaHome);
    });

    it('should produce consistent results for same state', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const result1 = router.execute(inputState);
      const result2 = router.execute(inputState);

      expect(result1).toBe(result2);
    });
  });

  describe('execute() - Multiple invocations', () => {
    it('should handle sequential calls with different states', () => {
      const state1 = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const state2 = createTestState({
        android_home: undefined,
        java_home: undefined,
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(setupExtractedNodeName);
      expect(result2).toBe(failureNodeName);
    });

    it('should maintain independence across invocations', () => {
      const successState = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
      });

      const failureState = createTestState({
        android_home: undefined,
        java_home: '/path/to/java',
      });

      router.execute(successState);
      const result = router.execute(failureState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - State with other properties', () => {
    it('should ignore other state properties', () => {
      const inputState = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
        platform: 'Android',
        projectName: 'TestProject',
        validPlatformSetup: false,
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });

    it('should only depend on android_home and java_home', () => {
      const state1 = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
        platform: 'iOS',
      });

      const state2 = createTestState({
        android_home: '/path/to/android',
        java_home: '/path/to/java',
        platform: 'Android',
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(result2);
      expect(result1).toBe(setupExtractedNodeName);
    });
  });
});
