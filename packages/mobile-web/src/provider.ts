/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpProvider, McpTool, Services } from '@salesforce/mcp-provider-api';
import { MobileOfflineAnalysisMcpTool } from './provider-tools/mobile-offline-analysis-mcp-tool.js';
import { MobileOfflineGuidanceMcpTool } from './provider-tools/mobile-offline-guidance-mcp-tool.js';

/**
 * MobileWebMcpProvider exposes mobile-offline tools for integration with other MCP packages.
 * This provider focuses on mobile offline capabilities and excludes native-capabilities tools.
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
   * Provides an array of McpTool instances for mobile-offline capabilities.
   * @param services Services provided by the MCP framework
   * @returns Promise resolving to array of McpTool instances
   */
  public provideTools(services: Services): Promise<McpTool[]> {
    return Promise.resolve([
      new MobileOfflineAnalysisMcpTool(services.getTelemetryService()),
      new MobileOfflineGuidanceMcpTool(services.getTelemetryService()),
    ]);
  }

  // This MobileWebMcpProvider does not implement provideResources or providePrompts
  // since the main MCP server doesn't consume them yet.
}
