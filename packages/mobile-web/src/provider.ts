/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpProvider, McpTool, Services } from '@salesforce/mcp-provider-api';
import { MobileOfflineAnalysisMcpTool } from './provider-tools/mobile-offline-analysis-mcp-tool.js';
import { MobileOfflineGuidanceMcpTool } from './provider-tools/mobile-offline-guidance-mcp-tool.js';
import { NativeCapabilitiesGuidanceMcpTool } from './provider-tools/native-capabilities-guidance-mcp-tool.js';
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
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new AppReviewTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new ArSpaceCaptureTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new BarcodeScannerTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new BiometricsTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new CalendarTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new ContactsTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new DocumentScannerTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new GeofencingTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new LocationTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new NfcTool()),
      new NativeCapabilitiesGuidanceMcpTool(telemetryService, new PaymentsTool()),
    ]);
  }
}
