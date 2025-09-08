/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { EmptySchema, TextOutputSchema } from '../schemas/lwcSchema.js';
import {
  McpTool,
  McpToolConfig,
  ReleaseState,
  TelemetryService,
  Toolset,
} from '@salesforce/mcp-provider-api';

import { GeofencingTool } from '../tools/native-capabilities/geofencing/tool.js';

type InputArgsShape = typeof EmptySchema.shape;
type OutputArgsShape = typeof TextOutputSchema.shape;
type InputArgs = z.infer<typeof EmptySchema>;

/**
 * MCP Tool adapter for GeofencingTool that enables integration with other MCP packages.
 * Wraps the existing GeofencingTool functionality while implementing the McpTool interface.
 */
export class GeofencingMcpTool extends McpTool<InputArgsShape, OutputArgsShape> {
  private readonly telemetryService: TelemetryService;
  private readonly wrappedTool: GeofencingTool;

  /**
   * Constructs a new GeofencingMcpTool with the provided services.
   * @param telemetryService The telemetry service for tracking tool usage
   */
  public constructor(telemetryService: TelemetryService) {
    super();
    this.telemetryService = telemetryService;
    this.wrappedTool = new GeofencingTool();
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
    return this.wrappedTool.toolId;
  }

  /**
   * Returns the tool's configuration including schema and metadata.
   * @returns The tool configuration
   */
  public getConfig(): McpToolConfig<InputArgsShape, OutputArgsShape> {
    return {
      title: this.wrappedTool.title,
      description: this.wrappedTool.description,
      inputSchema: EmptySchema.shape,
      outputSchema: TextOutputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    };
  }

  /**
   * Executes the geofencing tool to get API documentation and guidance.
   * @param _input Empty input object (no input required)
   * @returns Promise resolving to the geofencing documentation
   */
  public async exec(_input: InputArgs): Promise<CallToolResult> {
    try {
      // Send telemetry event for tool usage
      this.telemetryService.sendEvent('mobileWebGeofencing', {
        toolId: this.wrappedTool.toolId,
        serviceName: this.wrappedTool.serviceName,
      });

      // Call the wrapped tool's handleRequest method
      const result = await this.wrappedTool.handleRequest();

      if (result.isError) {
        return {
          isError: true,
          content: result.content,
        };
      }

      const contentText = result.content[0]?.text || '';

      return {
        content: [
          {
            type: 'text',
            text: contentText,
          },
        ],
        structuredContent: {
          content: contentText,
        },
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to get geofencing documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
