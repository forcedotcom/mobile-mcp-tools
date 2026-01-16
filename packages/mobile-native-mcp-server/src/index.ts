#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SFMobileNativeTemplateSelectionTool } from './tools/plan/sfmobile-native-template-selection/tool.js';
import { UtilsXcodeAddFilesTool } from './tools/utils/utils-xcode-add-files/tool.js';

import { SFMobileNativeDeploymentTool } from './tools/run/sfmobile-native-deployment/tool.js';
import { SFMobileNativeBuildRecoveryTool } from './tools/plan/sfmobile-native-build-recovery/tool.js';
import { MobileNativeOrchestrator } from './tools/workflow/sfmobile-native-project-manager/tool.js';
import { SFMobileNativeCompletionTool } from './tools/workflow/sfmobile-native-completion/tool.js';
import { SFMobileNativeFailureTool } from './tools/workflow/sfmobile-native-failure/tool.js';

import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version;
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { MobileAppProjectPrompt } from './prompts/index.js';
import { createSFMobileNativeGetInputTool } from './tools/utils/sfmobile-native-get-input/factory.js';
import { createSFMobileNativeInputExtractionTool } from './tools/utils/sfmobile-native-input-extraction/factory.js';

const server = new McpServer(
  {
    name: 'sfdc-mobile-native-mcp-server',
    version,
  },
  { capabilities: { logging: {} } }
);

// Define annotations for different tool types
const readOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const orchestratorAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

// Initialize tools
const orchestrator = new MobileNativeOrchestrator(server);
const getInputTool = createSFMobileNativeGetInputTool(server);
const inputExtractionTool = createSFMobileNativeInputExtractionTool(server);
const templateSelectionTool = new SFMobileNativeTemplateSelectionTool(server);
const buildRecoveryTool = new SFMobileNativeBuildRecoveryTool(server);
const deploymentTool = new SFMobileNativeDeploymentTool(server);
const xcodeAddFilesTool = new UtilsXcodeAddFilesTool(server);
const completionTool = new SFMobileNativeCompletionTool(server);
const failureTool = new SFMobileNativeFailureTool(server);

// Initialize prompts
const mobileAppProjectPrompt = new MobileAppProjectPrompt(server);

// Register orchestrator with specific annotations
orchestrator.register(orchestratorAnnotations);

// Register all other tools with read-only annotations
getInputTool.register(readOnlyAnnotations);
inputExtractionTool.register(readOnlyAnnotations);
templateSelectionTool.register(readOnlyAnnotations);
buildRecoveryTool.register(readOnlyAnnotations);
deploymentTool.register(readOnlyAnnotations);
xcodeAddFilesTool.register(readOnlyAnnotations);
completionTool.register(readOnlyAnnotations);
failureTool.register(readOnlyAnnotations);

// Register prompts
mobileAppProjectPrompt.register();

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
