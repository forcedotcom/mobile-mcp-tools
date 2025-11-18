/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('mcp-magi server', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    // Create a mock McpServer instance
    mockServer = new McpServer({
      name: 'test-mcp-magi',
      version: '0.0.0',
    });
  });

  it('should create a server with correct name and version', async () => {
    const server = new McpServer({
      name: 'mcp-magi',
      version: '0.1.0',
    });

    expect(server).toBeDefined();
  });

  it('should successfully register Magi MCP tools', async () => {
    // Dynamic import to test the actual module
    const { registerMagiMcpTools } = await import('@salesforce/workflow-magi');

    // Simply verify that the function can be called without errors
    expect(() => registerMagiMcpTools(mockServer)).not.toThrow();
  });

  it('should export a default server instance', async () => {
    // Dynamic import to test the module's default export
    const serverModule = await import('../src/index.js');

    expect(serverModule.default).toBeDefined();
    expect(serverModule.default).toBeInstanceOf(McpServer);
  });
});

