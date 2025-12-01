/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { State, ANDROID_SETUP_PROPERTIES } from '../metadata.js';
import {
  BaseNode,
  createComponentLogger,
  createUserInputExtractionNode,
} from '@salesforce/magen-mcp-workflow';
import { SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID } from '../../tools/utils/sfmobile-native-input-extraction/metadata.js';
import { saveEnvVarsToFile } from '../utils/envConfig.js';

/**
 * Node that extracts Android setup information from user input and sets environment variables.
 *
 * This node:
 * 1. Extracts androidHome and javaHome from user input
 * 2. Validates that the paths exist
 * 3. Sets ANDROID_HOME and JAVA_HOME in process.env
 * 4. Saves valid paths to ~/.magen/env_vars for future use
 * 5. Adds error messages to state if paths are invalid or missing
 */
export class ExtractAndroidSetupNode extends BaseNode<State> {
  private readonly baseExtractNode: BaseNode<State>;
  private readonly logger = createComponentLogger('ExtractAndroidSetupNode');

  constructor() {
    super('ExtractAndroidSetupNode');

    // Create base extraction node
    this.baseExtractNode = createUserInputExtractionNode<State>({
      requiredProperties: ANDROID_SETUP_PROPERTIES,
      toolId: SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID,
      userInputProperty: 'userInput',
    });
  }

  execute = (state: State): Partial<State> => {
    const result = this.baseExtractNode.execute(state);
    const errorMessages: string[] = [];

    // Validate extracted paths
    const androidHomePath = result.androidHome as string | undefined;
    const javaHomePath = result.javaHome as string | undefined;

    const validAndroidHome =
      androidHomePath && fs.existsSync(androidHomePath) ? androidHomePath : undefined;
    const validJavaHome = javaHomePath && fs.existsSync(javaHomePath) ? javaHomePath : undefined;

    // Handle ANDROID_HOME
    if (validAndroidHome) {
      process.env.ANDROID_HOME = validAndroidHome;
      this.logger.debug(`Set ANDROID_HOME: ${validAndroidHome}`);
    } else if (androidHomePath) {
      result.androidHome = undefined;
      errorMessages.push(`ANDROID_HOME path does not exist: ${androidHomePath}`);
    } else {
      result.androidHome = undefined;
      errorMessages.push('ANDROID_HOME was not provided');
    }

    // Handle JAVA_HOME
    if (validJavaHome) {
      process.env.JAVA_HOME = validJavaHome;
      this.logger.debug(`Set JAVA_HOME: ${validJavaHome}`);
    } else if (javaHomePath) {
      result.javaHome = undefined;
      errorMessages.push(`JAVA_HOME path does not exist: ${javaHomePath}`);
    } else {
      result.javaHome = undefined;
      errorMessages.push('JAVA_HOME was not provided');
    }

    // Save to env_vars file if at least one is valid
    if (validAndroidHome || validJavaHome) {
      const varsToSave: Record<string, string> = {};
      if (validAndroidHome) {
        varsToSave['ANDROID_HOME'] = validAndroidHome;
      }
      if (validJavaHome) {
        varsToSave['JAVA_HOME'] = validJavaHome;
      }
      saveEnvVarsToFile(varsToSave, this.logger);
    }

    // Append error messages if any
    if (errorMessages.length > 0) {
      result.workflowFatalErrorMessages = [
        ...(result.workflowFatalErrorMessages || []),
        ...errorMessages,
      ];
    }

    return result;
  };
}
