#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version as string;

import { EnvironmentValidatorTool } from './tools/plan/environment-validator.js';

const server = new McpServer({
  name: 'sfdc-mobile-native-mcp-server',
  version,
});

const defaultAnnotations: ToolAnnotations = {
  readOnlyHint: false, // environment checks may need to access system state
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const tools = [new EnvironmentValidatorTool()];

tools.forEach(tool => tool.register(server, defaultAnnotations));

export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Salesforce Mobile Native MCP Server running on stdio, from '${process.cwd()}'`);
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
