/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import { spawn, ChildProcess } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the MCP server entry point
const SERVER_COMMAND = 'ts-node';
const SERVER_ARGS = [join(__dirname, '../../../mobile-web/dist/index.js')];

export class MobileWebMcpClient {
  private client: Client;
  private transport: StdioClientTransport;
  private serverProcess: ChildProcess;

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
    console.log('🔄 Starting MCP server...');
    this.serverProcess = spawn('npm', ['run', 'mobile-web:server:start'], {
      cwd: path.resolve(__dirname, '../../../../..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    // Add process event handlers for debugging
    this.serverProcess.on('error', error => {
      console.error('❌ Server process error:', error);
    });

    this.serverProcess.on('exit', (code, signal) => {
      console.log(`🔄 Server process exited with code: ${code}, signal: ${signal}`);
    });

    await this.connectToMcpServer();
  }

  async disconnect() {
    try {
      console.log('🔄 Closing MCP client connection...');
      await this.client.close();
      console.log('✅ MCP client connection closed');
    } catch (error) {
      console.warn('Warning: Error closing MCP client:', error);
    }

    if (this.serverProcess) {
      console.log('🔄 Terminating server process...');
      this.serverProcess.kill('SIGTERM');
      // Give the process a moment to terminate gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Force kill if still running
      if (!this.serverProcess.killed) {
        console.log('🔄 Force killing server process...');
        this.serverProcess.kill('SIGKILL');
      }
      console.log('✅ Server process terminated');
    }
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(toolName: string, params: Record<string, unknown>) {
    return this.client.callTool({ name: toolName, arguments: params });
  }

  /**
   * Connect to the MCP server and wait for it to be ready
   * @param maxRetries - The maximum number of retries
   * @param retryIntervalMs - The interval between retries
   */
  private async connectToMcpServer(
    maxRetries: number = 30,
    retryIntervalMs: number = 1000
  ): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Try to create and connect a test client
        await this.client.connect(this.transport);
        // If we can list tools, server is ready
        await this.listTools();
        console.log('MCP server is ready');
        return;
      } catch (error) {
        retries++;
        console.log(`Waiting for MCP server to be ready... (attempt ${retries}/${maxRetries})`);

        if (retries >= maxRetries) {
          throw new Error(
            `MCP server failed to start after ${maxRetries} attempts. Last error: ${error}`
          );
        }

        await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
      }
    }
  }
}
