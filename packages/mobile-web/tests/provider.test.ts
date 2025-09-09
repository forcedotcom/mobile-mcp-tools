/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileWebMcpProvider } from '../src/provider.js';
import { Services, TelemetryService } from '@salesforce/mcp-provider-api';

describe('MobileWebMcpProvider', () => {
  let mockTelemetryService: TelemetryService;
  let mockServices: Services;

  beforeEach(() => {
    mockTelemetryService = {
      sendEvent: vi.fn(),
    } as unknown as TelemetryService;

    mockServices = {
      getTelemetryService: vi.fn().mockReturnValue(mockTelemetryService),
    } as unknown as Services;
  });

  it('should return correct provider name', () => {
    const provider = new MobileWebMcpProvider();
    expect(provider.getName()).toBe('MobileWebMcpProvider');
  });

  it('should provide mobile-offline and native-capabilities tools', async () => {
    const provider = new MobileWebMcpProvider();
    const tools = await provider.provideTools(mockServices);

    // Should provide 13 total tools: 2 mobile-offline + 11 native-capabilities
    expect(tools).toHaveLength(13);

    // Check mobile-offline tools
    expect(tools[0].getName()).toBe('sf-mobile-web-offline-analysis');
    expect(tools[1].getName()).toBe('sf-mobile-web-offline-guidance');

    // Check native-capabilities tools (now using NativeCapabilitiesGuidanceMcpTool)
    const nativeCapabilityTools = tools.slice(2);
    expect(nativeCapabilityTools).toHaveLength(11);

    // Verify native capability tool names (they now use the service names from underlying tools)
    const expectedToolNames = [
      'App Review Service',
      'AR Space Capture', 
      'Barcode Scanner',
      'Biometrics Service',
      'Calendar Service',
      'Contacts Service',
      'Document Scanner',
      'Geofencing Service',
      'Location Service',
      'NFC Service',
      'Payments Service'
    ];
    
    const actualToolNames = nativeCapabilityTools.map(tool => tool.getName());
    expect(actualToolNames).toEqual(expect.arrayContaining(expectedToolNames));
  });

  it('should pass telemetry service to tools', async () => {
    const provider = new MobileWebMcpProvider();
    await provider.provideTools(mockServices);

    // Should call getTelemetryService once (extracted to variable) for all 13 tools
    expect(mockServices.getTelemetryService).toHaveBeenCalledTimes(1);
  });
});
