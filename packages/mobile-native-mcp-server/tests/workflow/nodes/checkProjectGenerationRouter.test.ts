/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckProjectGenerationRouter } from '../../../src/workflow/nodes/checkProjectGenerationRouter.js';
import { createTestState } from '../../utils/stateBuilders.js';

describe('CheckProjectGenerationRouter', () => {
  const successNodeName = 'buildValidation';
  const failureNodeName = 'failure';
  let router: CheckProjectGenerationRouter;

  beforeEach(() => {
    router = new CheckProjectGenerationRouter(successNodeName, failureNodeName);
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router).toBeDefined();
    });

    it('should accept different node names', () => {
      const customRouter = new CheckProjectGenerationRouter('customSuccess', 'customFailure');
      expect(customRouter).toBeDefined();
    });
  });

  describe('execute() - Success cases', () => {
    it('should route to success node when projectPath is present and no fatal errors', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node when projectPath is present and error array is empty', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node with different project paths', () => {
      const inputState = createTestState({
        projectPath: '/different/project/path',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node with paths containing special characters', () => {
      const inputState = createTestState({
        projectPath: '/path-with_special/chars/project',
        workflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node with absolute paths', () => {
      const inputState = createTestState({
        projectPath: '/Users/username/projects/my-app',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success node with relative paths', () => {
      const inputState = createTestState({
        projectPath: './my-project',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });
  });

  describe('execute() - Missing projectPath', () => {
    it('should route to failure node when projectPath is undefined', () => {
      const inputState = createTestState({
        projectPath: undefined,
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when projectPath is empty string', () => {
      const inputState = createTestState({
        projectPath: '',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when projectPath is null', () => {
      const inputState = createTestState({
        projectPath: null as unknown as string,
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when state has no projectPath property', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Fatal errors present', () => {
    it('should route to failure node when fatal errors exist with valid projectPath', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: ['Error 1: Project generation failed'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when multiple fatal errors exist', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: ['Error 1: SDK not found', 'Error 2: Invalid configuration'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node with single fatal error', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: ['Command execution failed'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure node when both projectPath missing and errors present', () => {
      const inputState = createTestState({
        projectPath: undefined,
        workflowFatalErrorMessages: ['Error: No project path'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Edge cases', () => {
    it('should handle state with only projectPath', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should handle state with only error messages', () => {
      const inputState = createTestState({
        workflowFatalErrorMessages: ['Some error'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should not modify input state', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
      });

      const originalProjectPath = inputState.projectPath;
      const originalErrors = inputState.workflowFatalErrorMessages;

      router.execute(inputState);

      expect(inputState.projectPath).toBe(originalProjectPath);
      expect(inputState.workflowFatalErrorMessages).toBe(originalErrors);
    });

    it('should produce consistent results for same state', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
      });

      const result1 = router.execute(inputState);
      const result2 = router.execute(inputState);

      expect(result1).toBe(result2);
    });
  });

  describe('execute() - Multiple invocations', () => {
    it('should handle sequential calls with different states', () => {
      const state1 = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
      });

      const state2 = createTestState({
        projectPath: undefined,
        workflowFatalErrorMessages: ['Error'],
      });

      const result1 = router.execute(state1);
      const result2 = router.execute(state2);

      expect(result1).toBe(successNodeName);
      expect(result2).toBe(failureNodeName);
    });

    it('should maintain independence across invocations', () => {
      const successState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
      });

      const failureState = createTestState({
        projectPath: undefined,
        workflowFatalErrorMessages: undefined,
      });

      router.execute(successState);
      const result = router.execute(failureState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - State with other properties', () => {
    it('should ignore other state properties', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
        platform: 'Android',
        projectName: 'TestProject',
        validPlatformSetup: true,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should only depend on projectPath and workflowFatalErrorMessages', () => {
      const state1 = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
        platform: 'iOS',
      });

      const state2 = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: undefined,
        platform: 'Android',
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
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: [longError],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle error messages with special characters', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: ['Error: <>&"\'\n\t special characters'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should handle empty string error messages', () => {
      const inputState = createTestState({
        projectPath: '/path/to/project',
        workflowFatalErrorMessages: [''],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Real world scenarios', () => {
    it('should route to success after successful Android project generation', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectName: 'MyAndroidApp',
        projectPath: '/Users/developer/MyAndroidApp',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to success after successful iOS project generation', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyiOSApp',
        projectPath: '/Users/developer/MyiOSApp',
        workflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should route to failure when Android validation fails', () => {
      const inputState = createTestState({
        platform: 'Android',
        projectName: 'MyAndroidApp',
        projectPath: '/Users/developer/MyAndroidApp',
        workflowFatalErrorMessages: [
          'Generated project at /Users/developer/MyAndroidApp is not a valid Android project. Missing required files or directories.',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to failure when command execution fails', () => {
      const inputState = createTestState({
        projectPath: undefined,
        workflowFatalErrorMessages: [
          'Failed to generate project: Command not found: sf. Please ensure the Salesforce Mobile SDK CLI is properly installed and configured.',
        ],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Boolean evaluation edge cases', () => {
    it('should treat whitespace-only projectPath as valid', () => {
      const inputState = createTestState({
        projectPath: '   ',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      // Whitespace is truthy, so should route to success
      expect(result).toBe(successNodeName);
    });

    it('should handle projectPath with only slashes', () => {
      const inputState = createTestState({
        projectPath: '/',
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(successNodeName);
    });

    it('should handle number 0 as projectPath (edge case)', () => {
      const inputState = createTestState({
        projectPath: 0 as unknown as string,
        workflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      // Number 0 is falsy, should route to failure
      expect(result).toBe(failureNodeName);
    });
  });
});
