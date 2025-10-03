/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { ToolExecutor } from '../../src/workflow/nodes/toolExecutor.js';
import { MCPToolInvocationData } from '../../src/common/metadata.js';

/**
 * Test implementation of ToolExecutor that returns pre-configured results.
 * Useful for unit testing nodes without requiring the full LangGraph runtime.
 */
export class MockToolExecutor implements ToolExecutor {
  private results: Map<string, unknown> = new Map();
  private callHistory: Array<MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>> = [];

  /**
   * Configures the mock to return a specific result for a given tool.
   *
   * @param toolName The name of the tool (from llmMetadata.name)
   * @param result The result to return when this tool is executed
   */
  setResult(toolName: string, result: unknown): void {
    this.results.set(toolName, result);
  }

  /**
   * Executes a tool by returning the pre-configured result.
   * If no result is configured for this tool, returns undefined.
   *
   * @param toolInvocationData The tool invocation data
   * @returns The pre-configured result for this tool
   */
  execute(toolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>): unknown {
    this.callHistory.push(toolInvocationData);
    return this.results.get(toolInvocationData.llmMetadata.name);
  }

  /**
   * Returns the history of all tool invocations.
   * Useful for asserting that tools were called with correct parameters.
   */
  getCallHistory(): ReadonlyArray<MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>> {
    return [...this.callHistory];
  }

  /**
   * Returns the most recent tool invocation, or undefined if no calls have been made.
   */
  getLastCall(): MCPToolInvocationData<z.ZodObject<z.ZodRawShape>> | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Clears the call history and configured results.
   */
  reset(): void {
    this.results.clear();
    this.callHistory = [];
  }
}
