/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AbstractWorkflowTool } from './abstractWorkflowTool.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  MCPWorkflowToolOutput,
  WORKFLOW_PROPERTY_NAMES,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowStateData,
  WorkflowToolMetadata,
} from '../../common/metadata.js';
import { PRD_ORCHESTRATOR_TOOL } from '../magi/magi-prd-orchestrator/metadata.js';
import { Logger } from '../../logging/logger.js';

/**
 * Abstract base class for all PRD workflow-participating tools.
 *
 * This extends AbstractWorkflowTool but uses the PRD orchestrator instead of the main orchestrator.
 */
export abstract class PRDAbstractWorkflowTool<
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
    super(server, toolMetadata, loggerComponentName, logger);
  }

  /**
   * Override the base method to use the PRD orchestrator instead of the main orchestrator
   */
  protected finalizeWorkflowToolOutput(
    prompt: string,
    workflowStateData: WorkflowStateData,
    resultSchema?: TMetadata['resultSchema'] | string
  ): CallToolResult {
    let resultSchemaToUse = resultSchema ?? this.toolMetadata.resultSchema;
    if (!(typeof resultSchemaToUse === 'string')) {
      resultSchemaToUse = JSON.stringify(zodToJsonSchema(resultSchemaToUse));
    }
    const postInstructions = `

# Post-Tool-Invocation Instructions

## 1. Format the results from the execution of your task

The output of your task should conform to the following JSON schema:

\`\`\`json
${resultSchemaToUse}
\`\`\`

A string representation of this JSON schema can also be found in the \`resultSchema\`
field of this tool's output schema.

## 2. Invoke the next tool to continue the workflow

You MUST initiate the following actions to proceed with the in-progress workflow you are
participating in.

### 2.1. Invoke the \`${PRD_ORCHESTRATOR_TOOL.toolId}\` tool

Invoke the \`${PRD_ORCHESTRATOR_TOOL.toolId}\` tool, with the following input schema:

${JSON.stringify(zodToJsonSchema(PRD_ORCHESTRATOR_TOOL.inputSchema))}

### 2.2 Provide input values to the tool

Provide the following input values to the \`${PRD_ORCHESTRATOR_TOOL.toolId}\` tool, associated
with the input schema from the last step:

- \`${WORKFLOW_PROPERTY_NAMES.userInput}\`: The structured results from the execution of your task, as specified in the first Post-Tool-Invocation step.
- \`${WORKFLOW_PROPERTY_NAMES.workflowStateData}\`: ${JSON.stringify(workflowStateData)}

This will continue the workflow orchestration process.
`;

    const promptForLLM = prompt + postInstructions;
    const result: MCPWorkflowToolOutput = {
      promptForLLM,
      resultSchema: resultSchemaToUse,
    };
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result),
        },
      ],
      structuredContent: result,
    };
  }
}
