/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { ToolExecutor } from '../../src/nodes/toolExecutor.js';
import { InterruptData, isNodeGuidanceData } from '../../src/common/metadata.js';

/**
 * Test implementation of ToolExecutor that returns pre-configured results.
 * Useful for unit testing nodes without requiring the full LangGraph runtime.
 * Supports both MCPToolInvocationData (delegate mode) and NodeGuidanceData (direct guidance mode).
 */
export class MockToolExecutor implements ToolExecutor {
  private results: Map<string, unknown> = new Map();
  private callHistory: Array<InterruptData<z.ZodObject<z.ZodRawShape>>> = [];

  /**
   * Configures the mock to return a specific result for a given tool/node.
   *
   * @param toolOrNodeId The tool name (from llmMetadata.name) or node ID (from nodeId)
   * @param result The result to return when this tool/node is executed
   */
  setResult(toolOrNodeId: string, result: unknown): void {
    this.results.set(toolOrNodeId, result);
  }

  /**
   * Executes a tool by returning the pre-configured result.
   * If no result is configured for this tool/node, returns undefined.
   *
   * Handles both MCPToolInvocationData and NodeGuidanceData.
   *
   * @param interruptData The interrupt data (tool invocation or node guidance)
   * @returns The pre-configured result for this tool/node
   */
  execute(interruptData: InterruptData<z.ZodObject<z.ZodRawShape>>): unknown {
    this.callHistory.push(interruptData);

    // Get the identifier based on the interrupt data type
    const id = isNodeGuidanceData(interruptData)
      ? interruptData.nodeId
      : interruptData.llmMetadata.name;

    return this.results.get(id);
  }

  /**
   * Returns the history of all tool/node invocations.
   * Useful for asserting that tools/nodes were called with correct parameters.
   */
  getCallHistory(): ReadonlyArray<InterruptData<z.ZodObject<z.ZodRawShape>>> {
    return [...this.callHistory];
  }

  /**
   * Returns the most recent tool/node invocation, or undefined if no calls have been made.
   */
  getLastCall(): InterruptData<z.ZodObject<z.ZodRawShape>> | undefined {
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
