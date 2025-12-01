/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '@salesforce/magen-mcp-workflow';

/**
 * Loads environment variables from the ~/.magen/env_vars file.
 * Returns a map of key-value pairs from the file.
 *
 * @returns Record of environment variable key-value pairs
 */
export function loadEnvVarsFromFile(): Record<string, string> {
  const envConfigPath = path.join(os.homedir(), '.magen', 'env_vars');
  const envVars: Record<string, string> = {};

  if (!fs.existsSync(envConfigPath)) {
    return envVars;
  }

  try {
    const fileContent = fs.readFileSync(envConfigPath, 'utf-8');
    fileContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('='); // Rejoin in case value contains '='
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to read env config file: ${error}`);
  }

  return envVars;
}

/**
 * Saves environment variables to the ~/.magen/env_vars file.
 * Creates the directory if it doesn't exist.
 * Merges with existing values.
 *
 * @param vars - Environment variables to save
 * @param logger - Optional logger for warnings
 */
export function saveEnvVarsToFile(vars: Record<string, string>, logger?: Logger): void {
  const envConfigDir = path.join(os.homedir(), '.magen');
  const envConfigPath = path.join(envConfigDir, 'env_vars');

  try {
    // Ensure directory exists
    if (!fs.existsSync(envConfigDir)) {
      fs.mkdirSync(envConfigDir, { recursive: true });
    }

    // Read existing file content or start with empty object
    const existingVars = loadEnvVarsFromFile();

    // Merge with new values
    const mergedVars = { ...existingVars, ...vars };

    // Write back to file
    const fileContent = Object.entries(mergedVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    fs.writeFileSync(envConfigPath, fileContent + '\n', 'utf-8');
  } catch (error) {
    const errorMsg = `Failed to save env vars to file: ${error}`;
    if (logger) {
      logger.warn(errorMsg);
    } else {
      console.warn(errorMsg);
    }
  }
}

/**
 * Loads and sets Android/Java environment variables from the config file.
 * Sets ANDROID_HOME and JAVA_HOME in process.env if they exist in the config
 * and the directories are valid.
 *
 * @param logger - Optional logger for debug messages
 * @returns Object indicating which variables were loaded
 */
export function loadAndSetEnvVars(logger?: Logger): {
  androidHomeLoaded: boolean;
  javaHomeLoaded: boolean;
} {
  const result = {
    androidHomeLoaded: false,
    javaHomeLoaded: false,
  };

  try {
    const envVars = loadEnvVarsFromFile();

    // Check for ANDROID_HOME (case-insensitive for backwards compatibility)
    const configAndroidHome = envVars['ANDROID_HOME'] || envVars['android_home'];
    if (configAndroidHome && fs.existsSync(configAndroidHome)) {
      process.env.ANDROID_HOME = configAndroidHome;
      result.androidHomeLoaded = true;
      logger?.debug(`Loaded ANDROID_HOME from config: ${configAndroidHome}`);
    }

    // Check for JAVA_HOME (case-insensitive for backwards compatibility)
    const configJavaHome = envVars['JAVA_HOME'] || envVars['java_home'];
    if (configJavaHome && fs.existsSync(configJavaHome)) {
      process.env.JAVA_HOME = configJavaHome;
      result.javaHomeLoaded = true;
      logger?.debug(`Loaded JAVA_HOME from config: ${configJavaHome}`);
    }
  } catch (error) {
    logger?.warn(`Failed to load env vars from config: ${error}`);
  }

  return result;
}
