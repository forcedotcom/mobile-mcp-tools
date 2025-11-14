/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AbstractWorkflowTool,
  Logger,
  WorkflowToolMetadata,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
} from '@salesforce/magen-mcp-workflow';
import z from 'zod';
import { PRD_ORCHESTRATOR_TOOL } from './magi-prd-orchestrator/metadata.js';

/**
 * Abstract base class for all tools that participate in the
 * magi-prd-orchestrator workflow.
 *
 * This class automatically sets the orchestratorToolId to
 * 'magi-prd-orchestrator' for all extending tools.
 */
export abstract class AbstractMagiPrdTool<
  TMetadata extends WorkflowToolMetadata<
    typeof WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
    z.ZodObject<z.ZodRawShape>,
    typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA
  >,
> extends AbstractWorkflowTool<TMetadata> {
  constructor(
    server: McpServer,
    toolMetadata: TMetadata,
    loggerComponentName?: string,
    logger?: Logger
  ) {
    super(server, toolMetadata, PRD_ORCHESTRATOR_TOOL.toolId, loggerComponentName, logger);
  }
}
