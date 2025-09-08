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
    
    // Check native-capabilities tools
    const nativeCapabilityTools = tools.slice(2);
    expect(nativeCapabilityTools).toHaveLength(11);
    
    // Verify all native capability tool names start with 'sfmobile-web-'
    nativeCapabilityTools.forEach(tool => {
      expect(tool.getName()).toMatch(/^sfmobile-web-/);
    });
  });

  it('should pass telemetry service to tools', async () => {
    const provider = new MobileWebMcpProvider();
    await provider.provideTools(mockServices);

    // Should call getTelemetryService once (extracted to variable) for all 13 tools
    expect(mockServices.getTelemetryService).toHaveBeenCalledTimes(1);
  });
});
