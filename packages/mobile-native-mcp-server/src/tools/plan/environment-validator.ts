/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// Plan Phase - Environment Validator
// Uses @salesforce/lwc-dev-mobile-core programmatic APIs to validate the local environment

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import programmatic APIs from lwc-dev-mobile-core (top-level exports)
import {
  RequirementProcessor,
  IOSEnvironmentRequirements,
  AndroidEnvironmentRequirements,
  CommandRequirements as CoreCommandRequirements,
} from '@salesforce/lwc-dev-mobile-core';

type Platform = 'ios' | 'android';
type CommandRequirements = CoreCommandRequirements;

// Minimal logger object used at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;

export class EnvironmentValidatorTool {
  readonly name = 'Environment Validator';
  readonly title = 'Mobile Native Environment Validator';
  readonly toolId = 'sfmobile-native-plan-environment-validator';
  readonly description =
    'Validates local environment readiness for iOS and/or Android development using programmatic APIs.';

  readonly inputSchema = z.object({
    platform: z.enum(['ios', 'android']),
    androidApiLevel: z.coerce.string().optional(),
  });

  register(server: McpServer, annotations: ToolAnnotations): void {
    const enhanced: ToolAnnotations = {
      ...annotations,
      readOnlyHint: false,
      idempotentHint: true,
      openWorldHint: true,
    };

    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      { ...enhanced, title: this.title },
      async (args: unknown) => {
        const rawParams = (args as { params?: unknown })?.params ?? args;
        const parsed = this.inputSchema.safeParse(rawParams ?? {});
        if (!parsed.success) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `Invalid input: ${parsed.error.message}` }],
          };
        }

        const { platform, androidApiLevel } = parsed.data as {
          platform: Platform;
          androidApiLevel?: string;
        };

        // Prepare requirements based on platform
        const requirements: CommandRequirements = {};

        requirements.setup =
          platform === 'android'
            ? new AndroidEnvironmentRequirements(logger, androidApiLevel)
            : new IOSEnvironmentRequirements(logger);

        try {
          const report = await RequirementProcessor.execute(requirements, { headless: true });

          const response = {
            platform,
            androidApiLevel: androidApiLevel ?? null,
            report,
          };

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error: unknown) {
          const message =
            error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: unknown }).message)
              : String(error);
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `Environment validation failed: ${message}` }],
          };
        }
      }
    );
  }
}
