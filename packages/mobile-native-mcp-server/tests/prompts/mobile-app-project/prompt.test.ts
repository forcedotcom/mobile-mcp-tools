/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MobileAppProjectPrompt } from '../../../src/prompts/mobile-app-project/prompt.js';
import {
  MOBILE_APP_PROJECT_PROMPT_NAME,
  MOBILE_APP_PROJECT_PROMPT_DESCRIPTION,
} from '../../../src/prompts/mobile-app-project/metadata.js';

describe('MobileAppProjectPrompt', () => {
  let server: McpServer;
  let prompt: MobileAppProjectPrompt;

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    prompt = new MobileAppProjectPrompt(server);
  });

  describe('constructor', () => {
    it('should create an instance extending AbstractPrompt', () => {
      expect(prompt).toBeDefined();
      expect(prompt).toHaveProperty('register');
      expect(typeof prompt.register).toBe('function');
    });
  });

  describe('register', () => {
    it('should register the prompt with the server', () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      expect(registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME]).toBeDefined();
    });

    it('should register with correct name and description', () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      expect(registeredPrompt.description).toBe(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION);
    });

    it('should register with platform argument schema', () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      expect(registeredPrompt.argsSchema).toBeDefined();
      expect(registeredPrompt.argsSchema.shape).toBeDefined();
      expect(registeredPrompt.argsSchema.shape.platform).toBeDefined();
    });

    it('should validate iOS platform value', () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];
      const platformSchema = registeredPrompt.argsSchema.shape.platform;

      const result = platformSchema.safeParse('iOS');
      expect(result.success).toBe(true);
    });

    it('should validate Android platform value', () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];
      const platformSchema = registeredPrompt.argsSchema.shape.platform;

      const result = platformSchema.safeParse('Android');
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform values', () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];
      const platformSchema = registeredPrompt.argsSchema.shape.platform;

      expect(platformSchema.safeParse('Windows').success).toBe(false);
      expect(platformSchema.safeParse('Linux').success).toBe(false);
      expect(platformSchema.safeParse('').success).toBe(false);
      expect(platformSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('generatePromptResponse', () => {
    it('should generate iOS response', async () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await registeredPrompt.callback({ platform: 'iOS' });

      expect(result.description).toBe(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION);
      expect(result.messages).toHaveLength(2);
    });

    it('should generate Android response', async () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await registeredPrompt.callback({ platform: 'Android' });

      expect(result.description).toBe(MOBILE_APP_PROJECT_PROMPT_DESCRIPTION);
      expect(result.messages).toHaveLength(2);
    });

    it('should include platform in user message', async () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await registeredPrompt.callback({ platform: 'iOS' });

      const userMessage = result.messages[0];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content.type).toBe('text');
      if (userMessage.content.type === 'text') {
        expect(userMessage.content.text).toContain('iOS');
        expect(userMessage.content.text).toContain('Magen framework');
      }
    });

    it('should include platform in assistant message', async () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await registeredPrompt.callback({ platform: 'Android' });

      const assistantMessage = result.messages[1];
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content.type).toBe('text');
      if (assistantMessage.content.type === 'text') {
        expect(assistantMessage.content.text).toContain('Android');
        expect(assistantMessage.content.text).toContain('sfmobile_native_project_manager');
      }
    });

    it('should describe workflow steps', async () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await registeredPrompt.callback({ platform: 'iOS' });

      const assistantMessage = result.messages[1];
      if (assistantMessage.content.type === 'text') {
        const text = assistantMessage.content.text;
        expect(text).toContain('workflow');
        expect(text).toContain('requirements');
        expect(text).toContain('template');
        expect(text).toContain('project');
        expect(text).toContain('build');
        expect(text).toContain('deployment');
      }
    });

    it('should mention orchestrator tool', async () => {
      prompt.register();

      const registeredPrompts = server['_registeredPrompts'];
      const registeredPrompt = registeredPrompts[MOBILE_APP_PROJECT_PROMPT_NAME];

      const result = await registeredPrompt.callback({ platform: 'iOS' });

      const assistantMessage = result.messages[1];
      if (assistantMessage.content.type === 'text') {
        expect(assistantMessage.content.text).toContain('sfmobile_native_project_manager');
      }
    });
  });
});
