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
    it('should route to setup extracted node when both androidHome and javaHome are present', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });

    it('should route to setup extracted node with different paths', () => {
      const inputState = createTestState({
        androidHome: '/different/android/path',
        javaHome: '/different/java/path',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });

    it('should route to setup extracted node with paths containing special characters', () => {
      const inputState = createTestState({
        androidHome: '/path-with_special/chars/android',
        javaHome: '/path-with_special/chars/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });
  });

  describe('execute() - Missing androidHome', () => {
    it('should route to failure node when androidHome is undefined', () => {
      const inputState = createTestState({
        androidHome: undefined,
        javaHome: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when androidHome is empty string', () => {
      const inputState = createTestState({
        androidHome: '',
        javaHome: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when androidHome is null', () => {
      const inputState = createTestState({
        androidHome: null as unknown as string,
        javaHome: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Missing javaHome', () => {
    it('should route to failure node when javaHome is undefined', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when javaHome is empty string', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: '',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when javaHome is null', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: null as unknown as string,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Both missing', () => {
    it('should route to failure node when both are undefined', () => {
      const inputState = createTestState({
        androidHome: undefined,
        javaHome: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when both are empty strings', () => {
      const inputState = createTestState({
        androidHome: '',
        javaHome: '',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when both are null', () => {
      const inputState = createTestState({
        androidHome: null as unknown as string,
        javaHome: null as unknown as string,
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
    it('should handle state with only androidHome', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle state with only javaHome', () => {
      const inputState = createTestState({
        javaHome: '/path/to/java',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should not modify input state', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
      });

      const originalAndroidHome = inputState.androidHome;
      const originalJavaHome = inputState.javaHome;

      router.execute(inputState);

      expect(inputState.androidHome).toBe(originalAndroidHome);
      expect(inputState.javaHome).toBe(originalJavaHome);
    });

    it('should produce consistent results for same state', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
      });

      const result1 = router.execute(inputState);
      const result2 = router.execute(inputState);

      expect(result1).toBe(result2);
    });
  });

  describe('execute() - Multiple invocations', () => {
    it('should handle sequential calls with different states', () => {
      const state1 = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
      });

      const state2 = createTestState({
        androidHome: undefined,
        javaHome: undefined,
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(setupExtractedNodeName);
      expect(result2).toBe(failureNodeName);
    });

    it('should maintain independence across invocations', () => {
      const successState = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
      });

      const failureState = createTestState({
        androidHome: undefined,
        javaHome: '/path/to/java',
      });

      router.execute(successState);
      const result = router.execute(failureState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - State with other properties', () => {
    it('should ignore other state properties', () => {
      const inputState = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
        platform: 'Android',
        projectName: 'TestProject',
        validPlatformSetup: false,
      });

      const result = router.execute(inputState);

      expect(result).toBe(setupExtractedNodeName);
    });

    it('should only depend on androidHome and javaHome', () => {
      const state1 = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
        platform: 'iOS',
      });

      const state2 = createTestState({
        androidHome: '/path/to/android',
        javaHome: '/path/to/java',
        platform: 'Android',
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(result2);
      expect(result1).toBe(setupExtractedNodeName);
    });
  });
});
