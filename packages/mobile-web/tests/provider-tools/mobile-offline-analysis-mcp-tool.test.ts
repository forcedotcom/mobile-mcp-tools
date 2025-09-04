/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileOfflineAnalysisMcpTool } from '../../src/provider-tools/mobile-offline-analysis-mcp-tool.js';
import { TelemetryService, ReleaseState, Toolset } from '@salesforce/mcp-provider-api';
import { LwcCodeType } from '../../src/schemas/lwcSchema.js';

describe('MobileOfflineAnalysisMcpTool', () => {
  let mockTelemetryService: TelemetryService;
  let tool: MobileOfflineAnalysisMcpTool;

  beforeEach(() => {
    mockTelemetryService = {
      sendEvent: vi.fn(),
    } as unknown as TelemetryService;

    tool = new MobileOfflineAnalysisMcpTool(mockTelemetryService);
  });

  it('should have correct name', () => {
    expect(tool.getName()).toBe('sf-mobile-web-offline-analysis');
  });

  it('should return NON_GA release state', () => {
    expect(tool.getReleaseState()).toBe(ReleaseState.NON_GA);
  });

  it('should belong to OTHER toolset', () => {
    expect(tool.getToolsets()).toEqual([Toolset.OTHER]);
  });

  it('should have correct configuration', () => {
    const config = tool.getConfig();

    expect(config.title).toBe('Salesforce Mobile Offline LWC Expert Static Analysis');
    expect(config.description).toContain('Analyzes LWC components for mobile-specific issues');
    expect(config.annotations.readOnlyHint).toBe(true);
    expect(config.annotations.destructiveHint).toBe(false);
    expect(config.annotations.idempotentHint).toBe(true);
    expect(config.annotations.openWorldHint).toBe(false);
  });

  it('should execute analysis successfully', async () => {
    const testInput: LwcCodeType = {
      name: 'TestComponent',
      namespace: 'c',
      html: [
        {
          path: 'testComponent.html',
          content: '<template><div>Test</div></template>',
        },
      ],
      js: [
        {
          path: 'testComponent.js',
          content:
            'import { LightningElement } from "lwc";\nexport default class TestComponent extends LightningElement {}',
        },
      ],
      css: [
        {
          path: 'testComponent.css',
          content: '.test { color: red; }',
        },
      ],
      jsMetaXml: {
        path: 'testComponent.js-meta.xml',
        content:
          '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>61.0</apiVersion><isExposed>false</isExposed></LightningComponentBundle>',
      },
    };

    const result = await tool.exec(testInput);

    expect(mockTelemetryService.sendEvent).toHaveBeenCalledWith('mobileWebOfflineAnalysis', {
      toolId: 'sfmobile-web-offline-analysis',
      componentName: 'TestComponent',
      namespace: 'c',
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.structuredContent).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Test with invalid input that would cause an error
    const invalidInput = {} as LwcCodeType;

    const result = await tool.exec(invalidInput);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to analyze code');
  });
});
