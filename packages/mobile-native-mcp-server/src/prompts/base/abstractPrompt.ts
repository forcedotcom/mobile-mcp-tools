/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Abstract base class for all MCP prompts in the mobile native server
 *
 * Provides a consistent interface for prompt registration and ensures
 * all prompts follow the same pattern.
 *
 * Implementing classes must:
 * 1. Call super(server) in their constructor
 * 2. Implement the register() method to register the prompt with the MCP server
 */
export abstract class AbstractPrompt {
  constructor(protected readonly server: McpServer) {}

  /**
   * Register the prompt with the MCP server
   *
   * This method should use server.prompt() to register the prompt
   * with appropriate name, description, arguments schema, and callback.
   */
  public abstract register(): void;
}
