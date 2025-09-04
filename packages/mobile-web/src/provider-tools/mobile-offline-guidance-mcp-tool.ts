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

import { OfflineGuidanceTool } from '../tools/mobile-offline/offline-guidance/tool.js';
import { ExpertsReviewInstructionsSchema } from '../schemas/analysisSchema.js';

// Define input and output schema types based on the existing tool
const EMPTY_INPUT_SCHEMA = z.object({}).describe('No input required');
type InputArgsShape = typeof EMPTY_INPUT_SCHEMA.shape;
type OutputArgsShape = typeof ExpertsReviewInstructionsSchema.shape;
type InputArgs = z.infer<typeof EMPTY_INPUT_SCHEMA>;

/**
 * MCP Tool adapter for OfflineGuidanceTool that enables integration with other MCP packages.
 * Wraps the existing OfflineGuidanceTool functionality while implementing the McpTool interface.
 */
export class MobileOfflineGuidanceMcpTool extends McpTool<InputArgsShape, OutputArgsShape> {
  private readonly telemetryService: TelemetryService;
  private readonly wrappedTool: OfflineGuidanceTool;

  /**
   * Constructs a new MobileOfflineGuidanceMcpTool with the provided services.
   * @param telemetryService The telemetry service for tracking tool usage
   */
  public constructor(telemetryService: TelemetryService) {
    super();
    this.telemetryService = telemetryService;
    this.wrappedTool = new OfflineGuidanceTool();
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
    return 'sf-mobile-web-offline-guidance';
  }

  /**
   * Returns the tool's configuration including schema and metadata.
   * @returns The tool configuration
   */
  public getConfig(): McpToolConfig<InputArgsShape, OutputArgsShape> {
    return {
      title: this.wrappedTool.title,
      description: this.wrappedTool.description,
      inputSchema: EMPTY_INPUT_SCHEMA.shape,
      outputSchema: ExpertsReviewInstructionsSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    };
  }

  /**
   * Executes the offline guidance tool to get review instructions.
   * @param input Empty input object (no input required)
   * @returns Promise resolving to the review instructions
   */
  public async exec(input: InputArgs): Promise<CallToolResult> {
    try {
      // Send telemetry event for tool usage
      this.telemetryService.sendEvent('mobileWebOfflineGuidance', {
        toolId: this.wrappedTool.toolId,
      });

      // Call the wrapped tool's getExpertReviewInstructions method directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reviewInstructions = (this.wrappedTool as any).getExpertReviewInstructions();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(reviewInstructions),
          },
        ],
        structuredContent: reviewInstructions,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to generate review instructions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
