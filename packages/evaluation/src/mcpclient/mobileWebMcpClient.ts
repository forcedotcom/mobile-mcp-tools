/**
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 **/

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Path to the MCP server entry point
const SERVER_COMMAND = 'ts-node';
const SERVER_ARGS = [require.resolve('../../../mobile-web/dist/index.js')];

export class MobileWebMcpClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    this.transport = new StdioClientTransport({
      command: SERVER_COMMAND,
      args: SERVER_ARGS,
    });
    this.client = new Client({
      name: 'MobileWebMcpClient',
      version: '1.0.0',
    });
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async disconnect() {
    await this.client.close();
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(toolName: string, params: Record<string, any>) {
    return this.client.callTool({ name: toolName, arguments: params });
  }
}
