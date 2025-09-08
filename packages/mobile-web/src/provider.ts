/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpProvider, McpTool, Services } from '@salesforce/mcp-provider-api';
import { MobileOfflineAnalysisMcpTool } from './provider-tools/mobile-offline-analysis-mcp-tool.js';
import { MobileOfflineGuidanceMcpTool } from './provider-tools/mobile-offline-guidance-mcp-tool.js';
import { AppReviewMcpTool } from './provider-tools/native-capabilities-app-review-mcp-tool.js';
import { ARSpaceCaptureMcpTool } from './provider-tools/native-capabilities-ar-space-capture-mcp-tool.js';
import { BarcodeScannerMcpTool } from './provider-tools/native-capabilities-barcode-scanner-mcp-tool.js';
import { BiometricsMcpTool } from './provider-tools/native-capabilities-biometrics-mcp-tool.js';
import { CalendarMcpTool } from './provider-tools/native-capabilities-calendar-mcp-tool.js';
import { ContactsMcpTool } from './provider-tools/native-capabilities-contacts-mcp-tool.js';
import { DocumentScannerMcpTool } from './provider-tools/native-capabilities-document-scanner-mcp-tool.js';
import { GeofencingMcpTool } from './provider-tools/native-capabilities-geofencing-mcp-tool.js';
import { LocationMcpTool } from './provider-tools/native-capabilities-location-mcp-tool.js';
import { NfcMcpTool } from './provider-tools/native-capabilities-nfc-mcp-tool.js';
import { PaymentsMcpTool } from './provider-tools/native-capabilities-payments-mcp-tool.js';

/**
 * MobileWebMcpProvider exposes mobile web tools for integration with other MCP packages.
 * This provider includes both mobile offline capabilities and native capabilities tools.
 */
export class MobileWebMcpProvider extends McpProvider {
  /**
   * Returns the name of this MCP Provider.
   * @returns The provider name
   */
  public getName(): string {
    return 'MobileWebMcpProvider';
  }

  /**
   * Provides an array of McpTool instances for mobile web capabilities.
   * @param services Services provided by the MCP framework
   * @returns Promise resolving to array of McpTool instances
   */
  public provideTools(services: Services): Promise<McpTool[]> {
    const telemetryService = services.getTelemetryService();

    return Promise.resolve([
      // Mobile offline tools
      new MobileOfflineAnalysisMcpTool(telemetryService),
      new MobileOfflineGuidanceMcpTool(telemetryService),

      // Native capabilities tools
      new AppReviewMcpTool(telemetryService),
      new ARSpaceCaptureMcpTool(telemetryService),
      new BarcodeScannerMcpTool(telemetryService),
      new BiometricsMcpTool(telemetryService),
      new CalendarMcpTool(telemetryService),
      new ContactsMcpTool(telemetryService),
      new DocumentScannerMcpTool(telemetryService),
      new GeofencingMcpTool(telemetryService),
      new LocationMcpTool(telemetryService),
      new NfcMcpTool(telemetryService),
      new PaymentsMcpTool(telemetryService),
    ]);
  }
}
