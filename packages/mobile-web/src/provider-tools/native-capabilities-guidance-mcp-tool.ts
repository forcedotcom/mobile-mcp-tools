import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  McpTool,
  McpToolConfig,
  ReleaseState,
  TelemetryService,
  Toolset,
} from '@salesforce/mcp-provider-api';
import { BaseTool } from '../tools/native-capabilities/baseTool.js';
import { EmptySchema, TextOutputSchema } from '../schemas/lwcSchema.js';

type InputArgsShape = typeof EmptySchema.shape;
type OutputArgsShape = typeof TextOutputSchema.shape;
type InputArgs = z.infer<typeof EmptySchema>;

export class NativeCapabilitiesGuidanceMcpTool extends McpTool<InputArgsShape, OutputArgsShape> {
  private readonly telemetryService: TelemetryService;
  private readonly guidanceTool: BaseTool;

  constructor(telemetryService: TelemetryService, guidanceTool: BaseTool) {
    super();
    this.telemetryService = telemetryService;
    this.guidanceTool = guidanceTool;
  }

  getReleaseState(): ReleaseState {
    return ReleaseState.NON_GA;
  }

  getToolsets(): Toolset[] {
    return [Toolset.OTHER];
  }

  getName(): string {
    return this.guidanceTool.name;
  }

  getConfig(): McpToolConfig<InputArgsShape, OutputArgsShape> {
    return {
      title: this.guidanceTool.title,
      description: this.guidanceTool.description,
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
   * Executes the guidance tool to get API documentation and guidance.
   * @param _input Empty input object (no input required)
   * @returns Promise resolving to the calendar documentation
   */
  public async exec(_input: InputArgs): Promise<CallToolResult> {
    try {
      // Send telemetry event for tool usage
      this.telemetryService.sendEvent(this.guidanceTool.name, {
        toolId: this.guidanceTool.toolId,
        serviceName: this.guidanceTool.serviceName,
      });

      // Call the guidance tool's handleRequest method
      const result = await this.guidanceTool.handleRequest();

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
            text: `Failed to get calendar documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
