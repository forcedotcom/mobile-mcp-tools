/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import z from 'zod';
import { execSync } from 'child_process';
import { loadAndSetEnvVars } from '../utils/envConfig.js';
import {
  filterAndroidSetupFailures,
  checkAndroidPlatformAndEmulatorImage,
} from '../utils/androidPlatformCheck.js';

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

export const PLATFORM_API_LEVELS = {
  iOS: '17.0',
  Android: '35',
} as const;

export class PlatformCheckNode extends BaseNode<State> {
  protected readonly logger: Logger;
  constructor(logger?: Logger) {
    super('checkPlatformSetup');
    this.logger = logger ?? createComponentLogger('PlatformCheckNode');
  }

  /**
   * Get Android environment properties from process.env to carry in state.
   */
  private getAndroidEnvProperties(): Pick<State, 'androidHome' | 'javaHome'> {
    return {
      androidHome: process.env.ANDROID_HOME ?? '',
      javaHome: process.env.JAVA_HOME ?? '',
    };
  }

  execute = async (state: State): Promise<Partial<State>> => {
    const platform = state.platform;
    const apiLevel = PLATFORM_API_LEVELS[platform];
    if (!apiLevel) {
      return {
        validPlatformSetup: false,
        workflowFatalErrorMessages: [`Invalid platform: ${state.platform}`],
      };
    }

    // For Android platform, check if Android/Java environment is configured
    if (platform === 'Android') {
      // First check if already set in process.env
      if (!process.env.ANDROID_HOME || !process.env.JAVA_HOME) {
        // Try to load from config file
        loadAndSetEnvVars(this.logger);

        // Check again after attempting to load from config
        if (!process.env.ANDROID_HOME || !process.env.JAVA_HOME) {
          return {
            validPlatformSetup: false,
            ...this.getAndroidEnvProperties(),
          };
        }
      }
    }

    // Execute the sf force lightning local setup command
    const command = `sf force lightning local setup -p ${platform.toLowerCase()} -l ${apiLevel} --json`;

    try {
      this.logger.debug(`Executing command (pre-execution)`, { command });
      const output = execSync(command, { encoding: 'utf-8', timeout: 120000 });

      const platformCheckResult = this.parsePlatformCheckOutput(output, command);

      this.logger.debug(`Executing command (post-execution)`, { output });

      if (platform === 'Android') {
        // Parse or schema error: no tests and CLI reported failure (e.g. invalid JSON).
        if (platformCheckResult.tests.length === 0 && !platformCheckResult.allRequirementsMet) {
          return {
            validPlatformSetup: false,
            workflowFatalErrorMessages:
              platformCheckResult.errorMessages.length > 0
                ? platformCheckResult.errorMessages
                : undefined,
            ...this.getAndroidEnvProperties(),
          };
        }
        const { filteredErrorMessages, allOtherRequirementsMet } = filterAndroidSetupFailures(
          platformCheckResult.tests,
          command
        );
        this.logger.debug(
          `Confirming the Android SDK and emulator image satisfy the requirement for API level ${apiLevel}`
        );
        const directCheck = await checkAndroidPlatformAndEmulatorImage(apiLevel, this.logger);
        const validPlatformSetup = allOtherRequirementsMet && directCheck.success;
        const workflowFatalErrorMessages = [
          ...filteredErrorMessages,
          ...(directCheck.errorMessage ? [directCheck.errorMessage] : []),
        ].filter(Boolean);
        return {
          validPlatformSetup,
          workflowFatalErrorMessages:
            workflowFatalErrorMessages.length > 0 ? workflowFatalErrorMessages : undefined,
          ...this.getAndroidEnvProperties(),
        };
      }

      return {
        validPlatformSetup: platformCheckResult.allRequirementsMet,
        workflowFatalErrorMessages:
          platformCheckResult.errorMessages.length > 0
            ? platformCheckResult.errorMessages
            : undefined,
        ...this.getAndroidEnvProperties(),
      };
    } catch (error) {
      this.logger.error(`Error executing platform check command: ${command}`, error as Error);
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        validPlatformSetup: false,
        workflowFatalErrorMessages: [`Error executing platform check command: ${errorMessage}`],
        ...this.getAndroidEnvProperties(),
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
    tests: PlatformCheckResult['tests'];
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
        tests: platformCheckResult.tests,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        allRequirementsMet: false,
        errorMessages: [`Command output is not valid JSON: ${errorMessage}`],
        tests: [],
      };
    }
  }
}
