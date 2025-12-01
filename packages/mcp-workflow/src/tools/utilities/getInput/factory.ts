/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../logging/logger.js';
import { GetInputTool } from './tool.js';

/**
 * Configuration options for creating a Get Input Tool
 */
export interface GetInputToolOptions {
  /**
   * The tool ID to use for the get input tool
   */
  toolId: string;

  /**
   * Orchestrator tool ID that this tool reports back to
   * @required
   */
  orchestratorToolId: string;

  /**
   * Optional logger instance for tool operations
   */
  logger?: Logger;
}

/**
 * Factory function to create a Get Input Tool with configurable tool ID
 *
 * @param server - The MCP server instance
 * @param options - Configuration options for the tool
 * @returns A configured Get Input Tool instance ready for registration
 *
 * @example
 * // Simple case - single MCP server
 * const getInputTool = createGetInputTool(server, {
 *   toolId: 'magen-get-input',
 *   orchestratorToolId: 'my-orchestrator',
 * });
 *
 * @example
 * // Multi-server environment - avoid collisions
 * const getInputTool = createGetInputTool(server, {
 *   toolId: 'mobile-magen-get-input',
 *   orchestratorToolId: 'mobile-orchestrator',
 * });
 */
export function createGetInputTool(server: McpServer, options: GetInputToolOptions): GetInputTool {
  return new GetInputTool(server, options.toolId, options.orchestratorToolId, options.logger);
}
