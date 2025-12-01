/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../logging/logger.js';
import { InputExtractionTool } from './tool.js';

/**
 * Configuration options for creating an Input Extraction Tool
 */
export interface InputExtractionToolOptions {
  /**
   * The tool ID to use for the input extraction tool
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
 * Factory function to create an Input Extraction Tool with configurable tool ID
 *
 * @param server - The MCP server instance
 * @param options - Configuration options for the tool
 * @returns A configured Input Extraction Tool instance ready for registration
 *
 * @example
 * // Simple case - single MCP server
 * const inputExtractionTool = createInputExtractionTool(server, {
 *   toolId: 'magen-input-extraction',
 *   orchestratorToolId: 'my-orchestrator',
 * });
 *
 * @example
 * // Multi-server environment - avoid collisions
 * const inputExtractionTool = createInputExtractionTool(server, {
 *   toolId: 'mobile-magen-input-extraction',
 *   orchestratorToolId: 'mobile-orchestrator',
 * });
 */
export function createInputExtractionTool(
  server: McpServer,
  options: InputExtractionToolOptions
): InputExtractionTool {
  return new InputExtractionTool(
    server,
    options.toolId,
    options.orchestratorToolId,
    options.logger
  );
}
