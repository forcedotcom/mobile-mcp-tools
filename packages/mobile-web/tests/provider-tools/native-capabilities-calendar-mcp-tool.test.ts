/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarMcpTool } from '../../src/provider-tools/native-capabilities-calendar-mcp-tool.js';
import { TelemetryService, ReleaseState, Toolset } from '@salesforce/mcp-provider-api';
import { EmptySchema, TextOutputSchema } from '../../src/schemas/lwcSchema.js';

describe('CalendarMcpTool', () => {
  let mockTelemetryService: TelemetryService;
  let tool: CalendarMcpTool;

  beforeEach(() => {
    mockTelemetryService = {
      sendEvent: vi.fn(),
    } as unknown as TelemetryService;

    tool = new CalendarMcpTool(mockTelemetryService);
  });

  describe('Tool Properties', () => {
    it('should have correct release state', () => {
      expect(tool.getReleaseState()).toBe(ReleaseState.NON_GA);
    });

    it('should have correct toolsets', () => {
      expect(tool.getToolsets()).toEqual([Toolset.OTHER]);
    });

    it('should have correct name', () => {
      expect(tool.getName()).toBe('sfmobile-web-calendar');
    });
  });

  describe('Tool Configuration', () => {
    it('should have correct configuration', () => {
      const config = tool.getConfig();

      expect(config.title).toBe('Salesforce Mobile Calendar Service LWC Native Capability');
      expect(config.description).toContain('Calendar Service');
      expect(config.inputSchema).toBe(EmptySchema.shape);
      expect(config.outputSchema).toBe(TextOutputSchema.shape);
      expect(config.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    });
  });

  describe('Tool Execution', () => {
    it('should execute successfully and return content', async () => {
      const input = {};
      const result = await tool.exec(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Calendar Service Grounding Context');
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.content).toBe(result.content[0].text);
    });

    it('should send telemetry event', async () => {
      const input = {};
      await tool.exec(input);

      expect(mockTelemetryService.sendEvent).toHaveBeenCalledWith(
        'mobileWebCalendar',
        {
          toolId: 'sfmobile-web-calendar',
          serviceName: 'Calendar',
        }
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock the wrapped tool to throw an error
      const originalHandleRequest = tool['wrappedTool'].handleRequest;
      tool['wrappedTool'].handleRequest = vi.fn().mockRejectedValue(new Error('Test error'));

      const input = {};
      const result = await tool.exec(input);

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Failed to get calendar documentation');

      // Restore original method
      tool['wrappedTool'].handleRequest = originalHandleRequest;
    });
  });
});