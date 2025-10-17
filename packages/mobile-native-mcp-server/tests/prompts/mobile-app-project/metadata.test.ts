/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  MOBILE_APP_PROJECT_PROMPT_NAME,
  MOBILE_APP_PROJECT_PROMPT_DESCRIPTION,
  type MobileAppProjectPromptArguments,
} from '../../../src/prompts/mobile-app-project/metadata.js';

describe('Mobile App Project Metadata', () => {
  describe('MOBILE_APP_PROJECT_PROMPT_NAME', () => {
    it('should be defined', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_NAME).toBeDefined();
    });

    it('should be "mobile_app_project"', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_NAME).toBe('mobile_app_project');
    });

    it('should be a string', () => {
      expect(typeof MOBILE_APP_PROJECT_PROMPT_NAME).toBe('string');
    });

    it('should follow snake_case naming convention', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_NAME).toMatch(/^[a-z_]+$/);
    });
  });

  describe('MOBILE_APP_PROJECT_PROMPT_DESCRIPTION', () => {
    it('should be defined', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION).toBeDefined();
    });

    it('should be a non-empty string', () => {
      expect(typeof MOBILE_APP_PROJECT_PROMPT_DESCRIPTION).toBe('string');
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION.length).toBeGreaterThan(0);
    });

    it('should mention Magen', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION).toContain('Magen');
    });

    it('should mention iOS', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION).toContain('iOS');
    });

    it('should mention Android', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION).toContain('Android');
    });

    it('should mention mobile application', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION.toLowerCase()).toContain('mobile application');
    });

    it('should mention workflow', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION.toLowerCase()).toContain('workflow');
    });
  });

  describe('MobileAppProjectPromptArguments', () => {
    it('should accept iOS platform', () => {
      const args: MobileAppProjectPromptArguments = { platform: 'iOS' };
      expect(args.platform).toBe('iOS');
    });

    it('should accept Android platform', () => {
      const args: MobileAppProjectPromptArguments = { platform: 'Android' };
      expect(args.platform).toBe('Android');
    });

    it('should have platform property', () => {
      const args: MobileAppProjectPromptArguments = { platform: 'iOS' };
      expect(args).toHaveProperty('platform');
    });

    it('should enforce type safety at compile time', () => {
      // This test verifies TypeScript type checking works correctly
      // If this file compiles, the type is properly constrained
      const validArgs: MobileAppProjectPromptArguments = { platform: 'iOS' };
      expect(validArgs.platform).toBe('iOS');

      // The following would not compile (uncomment to test):
      // const invalidArgs: MobileAppProjectPromptArguments = { platform: 'Windows' };
    });
  });

  describe('Module exports', () => {
    it('should export MOBILE_APP_PROJECT_PROMPT_NAME', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_NAME).toBeDefined();
    });

    it('should export MOBILE_APP_PROJECT_PROMPT_DESCRIPTION', () => {
      expect(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION).toBeDefined();
    });

    it('should export MobileAppProjectPromptArguments type', () => {
      // Type-only test - verifies the type can be imported and used
      const args: MobileAppProjectPromptArguments = { platform: 'iOS' };
      expect(args).toBeDefined();
    });
  });
});
