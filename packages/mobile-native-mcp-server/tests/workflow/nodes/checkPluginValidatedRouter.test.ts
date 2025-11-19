/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckPluginValidatedRouter } from '../../../src/workflow/nodes/checkPluginValidatedRouter.js';
import { createTestState } from '../../utils/stateBuilders.js';

describe('CheckPluginValidatedRouter', () => {
  let router: CheckPluginValidatedRouter;
  const validNodeName = 'nextNode';
  const invalidNodeName = 'failureNode';

  beforeEach(() => {
    router = new CheckPluginValidatedRouter(validNodeName, invalidNodeName);
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router).toBeDefined();
      expect(router.execute).toBeDefined();
    });

    it('should accept any node names', () => {
      const customRouter = new CheckPluginValidatedRouter('customValid', 'customInvalid');
      expect(customRouter).toBeDefined();
    });
  });

  describe('execute()', () => {
    it('should route to valid node when validPluginSetup is true', () => {
      const state = createTestState({
        validPluginSetup: true,
      });

      const result = router.execute(state);

      expect(result).toBe(validNodeName);
    });

    it('should route to invalid node when validPluginSetup is false', () => {
      const state = createTestState({
        validPluginSetup: false,
      });

      const result = router.execute(state);

      expect(result).toBe(invalidNodeName);
    });

    it('should route to invalid node when validPluginSetup is undefined', () => {
      const state = createTestState({
        validPluginSetup: undefined,
      });

      const result = router.execute(state);

      expect(result).toBe(invalidNodeName);
    });

    it('should only consider validPluginSetup property', () => {
      const state = createTestState({
        validPluginSetup: true,
        validPlatformSetup: false,
        validEnvironment: false,
      });

      const result = router.execute(state);

      expect(result).toBe(validNodeName);
    });

    it('should not modify state', () => {
      const state = createTestState({
        validPluginSetup: true,
      });

      const originalValidPluginSetup = state.validPluginSetup;

      router.execute(state);

      expect(state.validPluginSetup).toBe(originalValidPluginSetup);
    });

    it('should return string node name', () => {
      const state = createTestState({
        validPluginSetup: true,
      });

      const result = router.execute(state);

      expect(typeof result).toBe('string');
    });
  });

  describe('execute() - Multiple Invocations', () => {
    it('should produce consistent results for same state', () => {
      const state = createTestState({
        validPluginSetup: true,
      });

      const result1 = router.execute(state);
      const result2 = router.execute(state);

      expect(result1).toBe(result2);
    });

    it('should handle alternating valid/invalid states', () => {
      const validState = createTestState({
        validPluginSetup: true,
      });

      const invalidState = createTestState({
        validPluginSetup: false,
      });

      expect(router.execute(validState)).toBe(validNodeName);
      expect(router.execute(invalidState)).toBe(invalidNodeName);
      expect(router.execute(validState)).toBe(validNodeName);
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle state with all properties undefined', () => {
      const state = createTestState({});

      const result = router.execute(state);

      expect(result).toBe(invalidNodeName);
    });

    it('should handle state with mixed valid properties', () => {
      const state = createTestState({
        validPluginSetup: true,
        validPlatformSetup: true,
        validEnvironment: true,
      });

      const result = router.execute(state);

      expect(result).toBe(validNodeName);
    });

    it('should handle state with mixed invalid properties', () => {
      const state = createTestState({
        validPluginSetup: false,
        validPlatformSetup: false,
        validEnvironment: false,
      });

      const result = router.execute(state);

      expect(result).toBe(invalidNodeName);
    });
  });

  describe('execute() - Return Value Validation', () => {
    it('should always return one of the two configured node names', () => {
      const validState = createTestState({ validPluginSetup: true });
      const invalidState = createTestState({ validPluginSetup: false });

      const validResult = router.execute(validState);
      const invalidResult = router.execute(invalidState);

      expect([validNodeName, invalidNodeName]).toContain(validResult);
      expect([validNodeName, invalidNodeName]).toContain(invalidResult);
    });

    it('should never return null or undefined', () => {
      const state = createTestState({ validPluginSetup: undefined });

      const result = router.execute(state);

      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });
  });
});
