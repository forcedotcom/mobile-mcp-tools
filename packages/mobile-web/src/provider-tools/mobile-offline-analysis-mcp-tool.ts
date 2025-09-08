/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  McpTool,
  McpToolConfig,
  ReleaseState,
  TelemetryService,
  Toolset,
} from '@salesforce/mcp-provider-api';

import { OfflineAnalysisTool } from '../tools/mobile-offline/offline-analysis/tool.js';
import { LwcCodeSchema } from '../schemas/lwcSchema.js';
import { ExpertsCodeAnalysisIssuesSchema } from '../schemas/analysisSchema.js';

// Define input and output schema types based on the existing tool
type InputArgsShape = typeof LwcCodeSchema.shape;
type OutputArgsShape = typeof ExpertsCodeAnalysisIssuesSchema.shape;
type InputArgs = z.infer<typeof LwcCodeSchema>;

/**
 * MCP Tool adapter for OfflineAnalysisTool that enables integration with other MCP packages.
 * Wraps the existing OfflineAnalysisTool functionality while implementing the McpTool interface.
 */
export class MobileOfflineAnalysisMcpTool extends McpTool<InputArgsShape, OutputArgsShape> {
  private readonly telemetryService: TelemetryService;
  private readonly wrappedTool: OfflineAnalysisTool;

  /**
   * Constructs a new MobileOfflineAnalysisMcpTool with the provided services.
   * @param telemetryService The telemetry service for tracking tool usage
   */
  public constructor(telemetryService: TelemetryService) {
    super();
    this.telemetryService = telemetryService;
    this.wrappedTool = new OfflineAnalysisTool();
  }

  /**
   * Returns the release state of this tool.
   * @returns The release state
   */
  public getReleaseState(): ReleaseState {
    return ReleaseState.NON_GA;
  }

  /**
   * Returns the toolsets this tool belongs to.
   * @returns Array of toolsets
   */
  public getToolsets(): Toolset[] {
    return [Toolset.OTHER];
  }

  /**
   * Returns the name of this tool following MCP provider conventions.
   * @returns The tool name
   */
  public getName(): string {
    return 'sf-mobile-web-offline-analysis';
  }

  /**
   * Returns the tool's configuration including schema and metadata.
   * @returns The tool configuration
   */
  public getConfig(): McpToolConfig<InputArgsShape, OutputArgsShape> {
    return {
      title: this.wrappedTool.title,
      description: this.wrappedTool.description,
      inputSchema: LwcCodeSchema.shape,
      outputSchema: ExpertsCodeAnalysisIssuesSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    };
  }

  /**
   * Executes the offline analysis tool with the provided input.
   * @param input The LWC code to analyze
   * @returns Promise resolving to the analysis results
   */
  public async exec(input: InputArgs): Promise<CallToolResult> {
    try {
      // Send telemetry event for tool usage
      this.telemetryService.sendEvent('mobileWebOfflineAnalysis', {
        toolId: this.wrappedTool.toolId,
        componentName: input.name,
        namespace: input.namespace || 'c',
      });

      // Call the wrapped tool's analyzeCode method directly
      const analysisResults = await this.wrappedTool.analyzeCode(input);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysisResults),
          },
        ],
        structuredContent: analysisResults,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to analyze code: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
