/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckFatalErrorsRouter } from '../../../../src/workflow/nodes/deployment/checkFatalErrorsRouter.js';
import { createTestState } from '../../../utils/stateBuilders.js';

describe('CheckFatalErrorsRouter', () => {
  const successNodeName = 'nextNode';
  const failureNodeName = 'failure';
  let router: CheckFatalErrorsRouter;

  beforeEach(() => {
    router = new CheckFatalErrorsRouter(successNodeName, failureNodeName);
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router).toBeDefined();
    });

    it('should accept different node names', () => {
      const customRouter = new CheckFatalErrorsRouter('customSuccess', 'customFailure');
      expect(customRouter).toBeDefined();
    });

    it('should use default router name when not provided', () => {
      const defaultRouter = new CheckFatalErrorsRouter(successNodeName, failureNodeName);
      expect(defaultRouter).toBeDefined();
    });

    it('should accept custom router name', () => {
      const customRouter = new CheckFatalErrorsRouter(
        successNodeName,
        failureNodeName,
        'CustomRouterName'
      );
      expect(customRouter).toBeDefined();
    });
  });

  describe('execute() - Success cases', () => {
    it('should route to success node when workflowFatalErrorMessages is undefined', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node when workflowFatalErrorMessages is empty array', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node when state has no workflowFatalErrorMessages property', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });
  });

  describe('execute() - Failure cases', () => {
    it('should route to failure node when single fatal error exists', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error: Command execution failed'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when multiple fatal errors exist', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: [
          'Error 1: SDK not found',
          'Error 2: Invalid configuration',
          'Error 3: Missing dependencies',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node with empty string error message', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: [''],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node with whitespace-only error message', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['   '],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Edge cases', () => {
    it('should not modify input state', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      const originalErrors = inputState.workflowFatalErrorMessages;

      router.execute(inputState);

      expect(inputState.workflowFatalErrorMessages).toBe(originalErrors);
    });

    it('should not modify input state with errors', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error message'],
      });

      const originalErrors = inputState.workflowFatalErrorMessages;

      router.execute(inputState);

      expect(inputState.workflowFatalErrorMessages).toBe(originalErrors);
      expect(inputState.workflowFatalErrorMessages).toEqual(['Error message']);
    });

    it('should produce consistent results for same state', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      const result1 = router.execute(inputState);
      const result2 = router.execute(inputState);

      expect(result1).toBe(result2);
      expect(result1).toBe(successNodeName);
    });

    it('should produce consistent results for same error state', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error occurred'],
      });

      const result1 = router.execute(inputState);
      const result2 = router.execute(inputState);

      expect(result1).toBe(result2);
      expect(result1).toBe(failureNodeName);
    });
  });

  describe('execute() - Multiple invocations', () => {
    it('should handle sequential calls with different states', () => {
      const successState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      const failureState = createTestState({
        workflowFatalErrorMessages: ['Error occurred'],
      });

      const result1 = router.execute(successState);
      const result2 = router.execute(failureState);

      expect(result1).toBe(successNodeName);
      expect(result2).toBe(failureNodeName);
    });

    it('should maintain independence across invocations', () => {
      const successState = createTestState({
        workflowFatalErrorMessages: [],
      });

      const failureState = createTestState({
        workflowFatalErrorMessages: ['Error'],
      });

      router.execute(successState);
      const result = router.execute(failureState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle alternating success and failure states', () => {
      const successState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      const failureState = createTestState({
        workflowFatalErrorMessages: ['Error'],
      });

      const results = [
        router.execute(successState),
        router.execute(failureState),
        router.execute(successState),
        router.execute(failureState),
      ];

      expect(results).toEqual([successNodeName, failureNodeName, successNodeName, failureNodeName]);
    });
  });

  describe('execute() - State with other properties', () => {
    it('should ignore other state properties when no errors', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: undefined,
        platform: 'Android',
        projectName: 'TestProject',
        validPlatformSetup: true,
        projectPath: '/path/to/project',
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should ignore other state properties when errors present', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error occurred'],
        platform: 'iOS',
        projectName: 'TestProject',
        validPlatformSetup: true,
        projectPath: '/path/to/project',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should only depend on workflowFatalErrorMessages', () => {
      const state1 = createTestState({
        workflowFatalErrorMessages: undefined,
        platform: 'iOS',
        projectName: 'Project1',
      });

      const state2 = createTestState({
        workflowFatalErrorMessages: undefined,
        platform: 'Android',
        projectName: 'Project2',
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(result2);
      expect(result1).toBe(successNodeName);
    });
  });

  describe('execute() - Error message variations', () => {
    it('should handle very long error messages', () => {
      const longError = 'Error: '.repeat(100) + 'Very long error message';
      const inputState = createTestState({
        workflowFatalErrorMessages: [longError],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle error messages with special characters', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error: <>&"\'\n\t special characters'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle error messages with unicode characters', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Error: 测试 🚀 émoji'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle multiple error messages with different formats', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: [
          'Simple error',
          'Error with details: Command failed with exit code 1',
          'Error: ',
          '   ',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Real world scenarios', () => {
    it('should route to success after successful emulator start', () => {
      const inputState = createTestState({
        platform: 'Android',
        androidEmulatorName: 'Pixel_5_API_33',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to failure when emulator start fails', () => {
      const inputState = createTestState({
        platform: 'Android',
        workflowFatalErrorMessages: [
          'Failed to start emulator: Emulator process exited with code 1',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to success after successful app installation', () => {
      const inputState = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        workflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to failure when app installation fails', () => {
      const inputState = createTestState({
        platform: 'iOS',
        workflowFatalErrorMessages: [
          'Failed to install app: Application bundle not found at expected path',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure with multiple installation errors', () => {
      const inputState = createTestState({
        platform: 'Android',
        workflowFatalErrorMessages: [
          'Failed to install app: Device not found',
          'Failed to install app: APK file corrupted',
          'Failed to install app: Insufficient storage space',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Router name customization', () => {
    it('should work with custom router name', () => {
      const customRouter = new CheckFatalErrorsRouter(
        successNodeName,
        failureNodeName,
        'CheckEmulatorStartedRouter'
      );

      const successState = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      const failureState = createTestState({
        workflowFatalErrorMessages: ['Error'],
      });

      expect(customRouter.execute(successState)).toBe(successNodeName);
      expect(customRouter.execute(failureState)).toBe(failureNodeName);
    });

    it('should work with different router names independently', () => {
      const router1 = new CheckFatalErrorsRouter(successNodeName, failureNodeName, 'Router1');
      const router2 = new CheckFatalErrorsRouter(successNodeName, failureNodeName, 'Router2');

      const state = createTestState({
        workflowFatalErrorMessages: undefined,
      });

      expect(router1.execute(state)).toBe(successNodeName);
      expect(router2.execute(state)).toBe(successNodeName);
    });
  });

  describe('execute() - Array length edge cases', () => {
    it('should handle single element array', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Single error'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle large array of errors', () => {
      const manyErrors = Array.from({ length: 100 }, (_, i) => `Error ${i + 1}`);
      const inputState = createTestState({
        workflowFatalErrorMessages: manyErrors,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });
});
