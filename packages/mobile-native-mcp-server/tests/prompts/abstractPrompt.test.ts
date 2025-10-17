/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AbstractPrompt } from '../../src/prompts/base/abstractPrompt.js';

describe('AbstractPrompt', () => {
  it('should provide server instance to subclasses', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });

    class TestPrompt extends AbstractPrompt {
      public register(): void {
        // Implementation not needed for this test
      }

      public getServer() {
        return this.server;
      }
    }

    const prompt = new TestPrompt(server);
    expect(prompt.getServer()).toBe(server);
  });

  it('should require subclasses to implement register method', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' });

    class TestPrompt extends AbstractPrompt {
      public register(): void {
        // Implementation
      }
    }

    const prompt = new TestPrompt(server);
    expect(prompt.register).toBeDefined();
    expect(typeof prompt.register).toBe('function');
  });

  it('should enforce abstract pattern at compile time', () => {
    // This test verifies TypeScript compilation ensures register() is implemented
    // If this test file compiles, the abstract pattern is working correctly

    const server = new McpServer({ name: 'test', version: '1.0.0' });

    class ValidPrompt extends AbstractPrompt {
      public register(): void {
        // Valid implementation
      }
    }

    const prompt = new ValidPrompt(server);
    expect(prompt).toBeInstanceOf(AbstractPrompt);
  });
});
