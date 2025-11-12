/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode } from '@salesforce/magen-mcp-workflow';
import z from 'zod';
import { createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import { execSync } from 'child_process';

const REQUIREMENT_RESULT_SCHEMA = z.object({
  title: z.string().describe('The title of the requirement check'),
  hasPassed: z.boolean().describe('Whether the individual requirement check passed'),
  duration: z.string().optional().describe('The duration of the requirement check in seconds'),
  message: z.string().describe('The detailed message of the check result'),
});

const PLATFORM_CHECK_SCHEMA = z.object({
  hasMetAllRequirements: z.boolean().describe('Whether all requirements have been met'),
  totalDuration: z
    .string()
    .optional()
    .describe('The total duration of the requirement checks in seconds'),
  tests: z
    .array(REQUIREMENT_RESULT_SCHEMA)
    .describe('Array of individual requirement check results'),
});

type PlatformCheckResult = z.infer<typeof PLATFORM_CHECK_SCHEMA>;

const PLATFORM_API_LEVELS = {
  iOS: '17.0',
  Android: '35',
} as const;

export class PlatformCheckNode extends BaseNode<State> {
  protected readonly logger: Logger;
  constructor(logger?: Logger) {
    super('checkPlatformSetup');
    this.logger = logger ?? createComponentLogger('PlatformCheckNode');
  }

  execute = (state: State): Partial<State> => {
    const platform = state.platform;
    const apiLevel = PLATFORM_API_LEVELS[platform];
    if (!apiLevel) {
      return {
        validPlatformSetup: false,
        workflowFatalErrorMessages: [`Invalid platform: ${state.platform}`],
      };
    }

    // Execute the sf force lightning local setup command
    const command = `sf force lightning local setup -p ${platform.toLowerCase()} -l ${apiLevel} --json`;

    try {
      this.logger.debug(`Executing command (pre-execution)`, { command });
      const output = execSync(command, { encoding: 'utf-8', timeout: 20000 });

      const platformCheckResult = this.parsePlatformCheckOutput(output, command);

      this.logger.debug(`Executing command (post-execution)`, { output });
      return {
        validPlatformSetup: platformCheckResult.allRequirementsMet,
        workflowFatalErrorMessages:
          platformCheckResult.errorMessages.length > 0
            ? platformCheckResult.errorMessages
            : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        validPlatformSetup: false,
        workflowFatalErrorMessages: [`Error executing platform check command: ${errorMessage}`],
      };
    }
  };

  // Parse and validate the JSON output
  private parsePlatformCheckOutput(
    output: string,
    command: string
  ): {
    allRequirementsMet: boolean;
    errorMessages: string[];
  } {
    try {
      const environmentCheckReport = JSON.parse(output);
      // Termimal output is a JSON object with 2 properties: outputContent and outputSchema. Only the outputContent is used in this case.
      const platformCheckResult: PlatformCheckResult = PLATFORM_CHECK_SCHEMA.parse(
        environmentCheckReport.outputContent
      );
      return {
        allRequirementsMet: platformCheckResult.hasMetAllRequirements,
        errorMessages: platformCheckResult.tests
          .filter(test => !test.hasPassed)
          .map(test => `Platform setup check for "${command}" failed: ${test.message}`),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        allRequirementsMet: false,
        errorMessages: [`Command output is not valid JSON: ${errorMessage}`],
      };
    }
  }
}
