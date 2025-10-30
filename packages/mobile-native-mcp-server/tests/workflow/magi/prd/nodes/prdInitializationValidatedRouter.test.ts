/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRDInitializationValidatedRouter } from '../../../../../src/workflow/magi/prd/nodes/prdInitializationValidatedRouter.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';

describe('PRDInitializationValidatedRouter', () => {
  let router: PRDInitializationValidatedRouter;
  const initializationValidatedNodeName = 'featureBriefGeneration';
  const failureNodeName = 'prdFailure';

  beforeEach(() => {
    router = new PRDInitializationValidatedRouter(
      initializationValidatedNodeName,
      failureNodeName
    );
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router['initializationValidatedNodeName']).toBe(initializationValidatedNodeName);
      expect(router['failureNodeName']).toBe(failureNodeName);
    });
  });

  describe('execute() - Routing Logic', () => {
    it('should route to failure node when error messages exist', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Error message'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });

    it('should route to initialized node when no errors', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(initializationValidatedNodeName);
    });

    it('should route to initialized node when error messages array is empty', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(initializationValidatedNodeName);
    });

    it('should route to failure node when multiple error messages exist', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Error 1', 'Error 2', 'Error 3'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle undefined error messages', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: undefined,
      });

      const result = router.execute(inputState);

      expect(result).toBe(initializationValidatedNodeName);
    });

    it('should handle empty array error messages', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: [],
      });

      const result = router.execute(inputState);

      expect(result).toBe(initializationValidatedNodeName);
    });

    it('should handle single error message', () => {
      const inputState = createPRDTestState({
        prdWorkflowFatalErrorMessages: ['Single error'],
      });

      const result = router.execute(inputState);

      expect(result).toBe(failureNodeName);
    });
  });
});
