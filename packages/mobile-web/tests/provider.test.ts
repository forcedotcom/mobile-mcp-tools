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

  it('should provide mobile-offline tools', async () => {
    const provider = new MobileWebMcpProvider();
    const tools = await provider.provideTools(mockServices);

    expect(tools).toHaveLength(2);
    expect(tools[0].getName()).toBe('sf-mobile-web-offline-analysis');
    expect(tools[1].getName()).toBe('sf-mobile-web-offline-guidance');
  });

  it('should pass telemetry service to tools', async () => {
    const provider = new MobileWebMcpProvider();
    await provider.provideTools(mockServices);

    expect(mockServices.getTelemetryService).toHaveBeenCalledTimes(2);
  });
});
