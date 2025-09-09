/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NativeCapabilitiesGuidanceMcpTool } from '../../src/provider-tools/native-capabilities-guidance-mcp-tool.js';
import { CalendarTool } from '../../src/tools/native-capabilities/calendar/tool.js';
import { AppReviewTool } from '../../src/tools/native-capabilities/appReview/tool.js';
import { TelemetryService, ReleaseState, Toolset } from '@salesforce/mcp-provider-api';
import { EmptySchema, TextOutputSchema } from '../../src/schemas/lwcSchema.js';

describe('NativeCapabilitiesGuidanceMcpTool', () => {
  let mockTelemetryService: TelemetryService;
  let calendarTool: CalendarTool;
  let appReviewTool: AppReviewTool;
  let guidanceToolWithCalendar: NativeCapabilitiesGuidanceMcpTool;
  let guidanceToolWithAppReview: NativeCapabilitiesGuidanceMcpTool;

  beforeEach(() => {
    mockTelemetryService = {
      sendEvent: vi.fn(),
    } as unknown as TelemetryService;

    calendarTool = new CalendarTool();
    appReviewTool = new AppReviewTool();
    guidanceToolWithCalendar = new NativeCapabilitiesGuidanceMcpTool(mockTelemetryService, calendarTool);
    guidanceToolWithAppReview = new NativeCapabilitiesGuidanceMcpTool(mockTelemetryService, appReviewTool);
  });

  describe('Tool Properties', () => {
    it('should have correct release state', () => {
      expect(guidanceToolWithCalendar.getReleaseState()).toBe(ReleaseState.NON_GA);
    });

    it('should have correct toolsets', () => {
      expect(guidanceToolWithCalendar.getToolsets()).toEqual([Toolset.OTHER]);
    });

    it('should have correct name based on underlying tool', () => {
      expect(guidanceToolWithCalendar.getName()).toBe('Calendar Service');
      expect(guidanceToolWithAppReview.getName()).toBe('App Review Service');
    });
  });

  describe('Tool Configuration', () => {
    it('should have correct configuration for calendar tool', () => {
      const config = guidanceToolWithCalendar.getConfig();

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

    it('should have correct configuration for app review tool', () => {
      const config = guidanceToolWithAppReview.getConfig();

      expect(config.title).toBe('Salesforce Mobile App Review LWC Native Capability');
      expect(config.description).toContain('App Review Service');
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
    it('should execute successfully and return content for calendar tool', async () => {
      const input = {};
      const result = await guidanceToolWithCalendar.exec(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Calendar Service Grounding Context');
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.content).toBe(result.content[0].text);
    });

    it('should execute successfully and return content for app review tool', async () => {
      const input = {};
      const result = await guidanceToolWithAppReview.exec(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('App Review Service Grounding Context');
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.content).toBe(result.content[0].text);
    });

    it('should send telemetry event for calendar tool', async () => {
      const input = {};
      await guidanceToolWithCalendar.exec(input);

      expect(mockTelemetryService.sendEvent).toHaveBeenCalledWith('Calendar Service', {
        toolId: 'sfmobile-web-calendar',
        serviceName: 'Calendar',
      });
    });

    it('should send telemetry event for app review tool', async () => {
      const input = {};
      await guidanceToolWithAppReview.exec(input);

      expect(mockTelemetryService.sendEvent).toHaveBeenCalledWith('App Review Service', {
        toolId: 'sfmobile-web-app-review',
        serviceName: 'App Review',
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock the guidance tool to throw an error
      const mockTool = {
        name: 'Test Tool',
        toolId: 'test-tool',
        serviceName: 'Test',
        handleRequest: vi.fn().mockRejectedValue(new Error('Test error'))
      };

      const guidanceToolWithError = new NativeCapabilitiesGuidanceMcpTool(mockTelemetryService, mockTool as any);
      
      const input = {};
      const result = await guidanceToolWithError.exec(input);

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Failed to get calendar documentation');
    });

    it('should handle tool result with isError flag', async () => {
      // Mock the guidance tool to return an error result
      const mockTool = {
        name: 'Test Tool',
        toolId: 'test-tool',
        serviceName: 'Test',
        handleRequest: vi.fn().mockResolvedValue({
          isError: true,
          content: [{ type: 'text', text: 'Tool error message' }]
        })
      };

      const guidanceToolWithError = new NativeCapabilitiesGuidanceMcpTool(mockTelemetryService, mockTool as any);
      
      const input = {};
      const result = await guidanceToolWithError.exec(input);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([{ type: 'text', text: 'Tool error message' }]);
    });
  });
});
