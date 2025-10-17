/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import server from '../../src/index.js';
import { MOBILE_APP_PROJECT_PROMPT_NAME } from '../../src/prompts/index.js';

describe('Prompt Integration', () => {
  describe('Server Registration', () => {
    it('should have the mobile_app_project prompt registered', () => {
      // Access the private _registeredPrompts property for testing
      const registeredPrompts = server['_registeredPrompts'];

      expect(registeredPrompts).toBeDefined();
      expect(registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME]).toBeDefined();

      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];
      expect(prompt).toBeDefined();
      expect(prompt.description).toBeTruthy();
      expect(prompt.argsSchema).toBeDefined();
    });

    it('should have platform argument schema defined', () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      expect(prompt.argsSchema).toBeDefined();
      expect(prompt.argsSchema.shape).toBeDefined();
      expect(prompt.argsSchema.shape.platform).toBeDefined();
    });
  });

  describe('Platform Validation', () => {
    it('should validate iOS platform value', () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const platformSchema = prompt.argsSchema.shape.platform;
      expect(platformSchema.safeParse('iOS').success).toBe(true);
    });

    it('should validate Android platform value', () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const platformSchema = prompt.argsSchema.shape.platform;
      expect(platformSchema.safeParse('Android').success).toBe(true);
    });

    it('should reject invalid platform values', () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const platformSchema = prompt.argsSchema.shape.platform;

      expect(platformSchema.safeParse('Windows').success).toBe(false);
      expect(platformSchema.safeParse('Linux').success).toBe(false);
      expect(platformSchema.safeParse('').success).toBe(false);
    });
  });

  describe('Prompt Execution', () => {
    it('should execute and return proper structure for iOS', async () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await prompt.callback({ platform: 'iOS' });

      expect(result).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should execute and return proper structure for Android', async () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await prompt.callback({ platform: 'Android' });

      expect(result).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should return messages with user and assistant roles', async () => {
      const registeredPrompts = server['_registeredPrompts'];
      const prompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await prompt.callback({ platform: 'iOS' });

      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
    });
  });
});
