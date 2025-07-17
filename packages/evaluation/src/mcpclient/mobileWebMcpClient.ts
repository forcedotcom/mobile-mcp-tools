/**
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 **/

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the MCP server entry point
const SERVER_COMMAND = 'ts-node';
const SERVER_ARGS = [join(__dirname, '../../../mobile-web/dist/index.js')];

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
    try {
      console.log('🔄 Closing MCP client connection...');
      await this.client.close();
      console.log('✅ MCP client connection closed');
    } catch (error) {
      console.warn('Warning: Error closing MCP client:', error);
    }
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(toolName: string, params: Record<string, unknown>) {
    return this.client.callTool({ name: toolName, arguments: params });
  }
}
