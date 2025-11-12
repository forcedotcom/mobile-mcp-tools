import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetInputTool, Logger } from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID } from './metadata.js';
import { ORCHESTRATOR_TOOL } from '../../workflow/sfmobile-native-project-manager/metadata.js';

export const createSFMobileNativeInputExtractionTool = (
  server: McpServer,
  logger?: Logger
): GetInputTool =>
  new GetInputTool(
    server,
    SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID,
    ORCHESTRATOR_TOOL.toolId,
    logger
  );
