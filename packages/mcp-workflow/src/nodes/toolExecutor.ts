/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { interrupt } from '@langchain/langgraph';
import { InterruptData } from '../common/metadata.js';

/**
 * Interface for tool execution mechanism.
 * Abstracts the LangGraph interrupt mechanism to enable dependency injection and testing.
 */
export interface ToolExecutor {
  /**
   * Executes a tool by invoking the underlying mechanism (e.g., LangGraph interrupt).
   *
   * @param interruptData The interrupt data to pass to the execution mechanism.
   *   Can be either MCPToolInvocationData (delegate mode) or NodeGuidanceData (direct guidance mode).
   * @returns The result from the tool execution (as unknown, to be validated by caller)
   */
  execute(interruptData: InterruptData<z.ZodObject<z.ZodRawShape>>): unknown;
}

/**
 * Production implementation of ToolExecutor that uses LangGraph's interrupt mechanism.
 * This is the default implementation used in production workflows.
 */
/* c8 ignore start */
export class LangGraphToolExecutor implements ToolExecutor {
  execute(interruptData: InterruptData<z.ZodObject<z.ZodRawShape>>): unknown {
    return interrupt(interruptData);
  }
}
/* c8 ignore stop */
