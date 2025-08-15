/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ZodType } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly title: string;
  readonly toolId: string;
  readonly inputSchema: ZodType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  readonly outputSchema?: ZodType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  register(server: McpServer, annotations: ToolAnnotations): void;
}
