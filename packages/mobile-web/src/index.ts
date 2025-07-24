#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version;
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

import { AppReviewTool } from './tools/native-capabilities/appReview/tool.js';
import { ArSpaceCaptureTool } from './tools/native-capabilities/arSpaceCapture/tool.js';
import { BarcodeScannerTool } from './tools/native-capabilities/barcodeScanner/tool.js';
import { BiometricsTool } from './tools/native-capabilities/biometrics/tool.js';
import { CalendarTool } from './tools/native-capabilities/calendar/tool.js';
import { ContactsTool } from './tools/native-capabilities/contacts/tool.js';
import { DocumentScannerTool } from './tools/native-capabilities/documentScanner/tool.js';
import { GeofencingTool } from './tools/native-capabilities/geofencing/tool.js';
import { LocationTool } from './tools/native-capabilities/location/tool.js';
import { NfcTool } from './tools/native-capabilities/nfc/tool.js';
import { PaymentsTool } from './tools/native-capabilities/payments/tool.js';
import { OfflineAnalysisTool } from './tools/mobile-offline/offline-analysis/tool.js';
import { OfflineGuidanceTool } from './tools/mobile-offline/offline-guidance/tool.js';
import { QuickActionConfigurationTool } from './tools/mobile-docs/quick-action-configuration/tool.js';

const server = new McpServer({
  name: 'sfdc-mobile-web-mcp-server',
  version,
});

// Define annotations
const annotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const tools = [
  new AppReviewTool(),
  new ArSpaceCaptureTool(),
  new BarcodeScannerTool(),
  new BiometricsTool(),
  new CalendarTool(),
  new ContactsTool(),
  new DocumentScannerTool(),
  new GeofencingTool(),
  new LocationTool(),
  new NfcTool(),
  new PaymentsTool(),
  new OfflineAnalysisTool(),
  new OfflineGuidanceTool(),
  new QuickActionConfigurationTool(),
];

// Register all tools
tools.forEach(tool => tool.register(server, annotations));

export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Salesforce Mobile Web MCP Server running on stdio, from '${process.cwd()}'`);
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
