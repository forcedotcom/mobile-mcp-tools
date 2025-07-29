/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileWebMcpClient } from '../../src/mcpclient/mobileWebMcpClient.js';
import { LwcReviewAgent } from '../../src/agent/lwcReviewAgent.js';
import { LWCComponent, LWCFileType } from '../../src/utils/lwcUtils.js';

describe('LwcReviewAgent', () => {
  let reviewAgent: LwcReviewAgent;
  let mockMcpClient: vi.Mocked<MobileWebMcpClient>;

  const mockComponent: LWCComponent = {
    files: [
      {
        name: 'testComponent',
        type: LWCFileType.HTML,
        content: '<template><div>Test</div></template>',
      },
      {
        name: 'testComponent',
        type: LWCFileType.JS,
        content: 'export default class TestComponent extends LightningElement {}',
      },
      {
        name: 'testComponent',
        type: LWCFileType.JS_META,
        content: `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>true</isExposed>
    <targetConfigs>
        <targetConfig targets="lightning__AppPage">
            <property name="namespace" value="c"/>
        </targetConfig>
    </targetConfigs>
</LightningComponentBundle>`,
      },
    ],
  };

  const mockGuidanceResponse = {
    content: [
      {
        text: JSON.stringify({
          reviewInstructions: [
            {
              expertReviewerName: 'Test Expert',
              supportedFileTypes: ['HTML', 'JS'],
              grounding: 'Test grounding',
              request: 'Test request',
              expectedResponseFormat: {
                schema: {},
                inputValues: { expertReviewerName: 'Test Expert' },
              },
            },
          ],
          orchestrationInstructions: 'Test orchestration',
        }),
      },
    ],
  };

  const mockAnalysisResponse = {
    content: [
      {
        text: JSON.stringify({
          analysisResults: [
            {
              expertReviewerName: 'Mobile Web Offline Analysis',
              issues: [
                {
                  type: 'test-issue',
                  description: 'Test issue description',
                  intentAnalysis: 'Test intent analysis',
                  suggestedAction: 'Test suggested action',
                  code: 'test code',
                  location: { startLine: 1, endLine: 2 },
                },
              ],
            },
          ],
          orchestrationInstructions: 'Test orchestration',
        }),
      },
    ],
  };

  beforeEach(() => {
    mockMcpClient = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      callTool: vi.fn(),
    } as any;

    reviewAgent = new LwcReviewAgent(mockMcpClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockMcpClient.disconnect();
  });

  describe('reviewLwcComponent', () => {
    it('should successfully review an LWC component and return analysis results', async () => {
      mockMcpClient.callTool
        .mockResolvedValueOnce(mockGuidanceResponse)
        .mockResolvedValueOnce(mockAnalysisResponse);

      const result = await reviewAgent.reviewLwcComponent(mockComponent);

      expect(mockMcpClient.connect).toHaveBeenCalledOnce();
      expect(mockMcpClient.callTool).toHaveBeenCalledTimes(2);
      expect(mockMcpClient.callTool).toHaveBeenNthCalledWith(1, 'sfmobile-web-offline-guidance', {});

      expect(result).toEqual({
        analysisResults: [
          {
            expertReviewerName: 'Mobile Web Offline Analysis',
            issues: [
              {
                type: 'test-issue',
                description: 'Test issue description',
                intentAnalysis: 'Test intent analysis',
                suggestedAction: 'Test suggested action',
                code: 'test code',
                location: { startLine: 1, endLine: 2 },
              },
            ],
          },
        ],
        orchestrationInstructions: 'Test orchestration',
      });
    });

    it('should throw error when guidance tool fails', async () => {
      mockMcpClient.callTool.mockResolvedValue({
        content: [],
      });

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow(
        'Failed to get guidance instructions from mobile-web offline-guidance tool'
      );
    });

    it('should throw error when analysis tool fails', async () => {
      mockMcpClient.callTool
        .mockResolvedValueOnce(mockGuidanceResponse)
        .mockResolvedValue({
          content: [],
        });

      await expect(reviewAgent.reviewLwcComponent(mockComponent)).rejects.toThrow(
        'Failed to get analysis results from mobile-web offline-analysis tool'
      );
    });

    it('should throw error when component is missing js-meta.xml file', async () => {
      const invalidComponent: LWCComponent = {
        files: [
          {
            name: 'testComponent',
            type: LWCFileType.HTML,
            content: '<template><div>Test</div></template>',
          },
        ],
      };

      await expect(reviewAgent.reviewLwcComponent(invalidComponent)).rejects.toThrow(
        'LWC component must include a js-meta.xml file'
      );
    });
  });

  describe('convertToLwcCodeType', () => {
    it('should correctly convert LWCComponent to LwcCodeType format', async () => {
      mockMcpClient.callTool
        .mockResolvedValueOnce(mockGuidanceResponse)
        .mockResolvedValueOnce(mockAnalysisResponse);

      await reviewAgent.reviewLwcComponent(mockComponent);

      // Verify the analysis tool was called with the correct format
      const analysisCall = mockMcpClient.callTool.mock.calls[1];
      expect(analysisCall[0]).toBe('sfmobile-web-offline-analysis');
      
      const lwcCode = analysisCall[1] as any;
      expect(lwcCode.name).toBe('testComponent');
      expect(lwcCode.namespace).toBe('c');
      expect(lwcCode.html).toHaveLength(1);
      expect(lwcCode.js).toHaveLength(1);
      expect(lwcCode.css).toHaveLength(0);
      expect(lwcCode.jsMetaXml).toBeDefined();
      expect(lwcCode.html[0].path).toBe('testComponent.html');
      expect(lwcCode.js[0].path).toBe('testComponent.js');
      expect(lwcCode.jsMetaXml.path).toBe('testComponent.js-meta.xml');
    });
  });
}); 