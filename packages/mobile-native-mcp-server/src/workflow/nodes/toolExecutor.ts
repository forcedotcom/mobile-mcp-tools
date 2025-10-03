/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { interrupt } from '@langchain/langgraph';
import { MCPToolInvocationData } from '../../common/metadata.js';

/**
 * Interface for tool execution mechanism.
 * Abstracts the LangGraph interrupt mechanism to enable dependency injection and testing.
 */
export interface ToolExecutor {
  /**
   * Executes a tool by invoking the underlying mechanism (e.g., LangGraph interrupt).
   *
   * @param toolInvocationData The tool invocation data to pass to the execution mechanism
   * @returns The result from the tool execution (as unknown, to be validated by caller)
   */
  execute(toolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>): unknown;
}

/**
 * Production implementation of ToolExecutor that uses LangGraph's interrupt mechanism.
 * This is the default implementation used in production workflows.
 */
export class LangGraphToolExecutor implements ToolExecutor {
  execute(toolInvocationData: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>): unknown {
    return interrupt(toolInvocationData);
  }
}
