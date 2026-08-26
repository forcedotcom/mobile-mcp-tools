/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as fs from 'fs';
import { loadEnvVarsFromFile } from './envConfig.js';

/**
 * Loads Android/Java paths from environment variables (process.env or config file).
 * Does not modify process.env - only reads values.
 *
 * @returns Object with androidHome and javaHome if found and valid
 */
export function loadAndroidPathsFromEnv(): {
  androidHome?: string;
  javaHome?: string;
} {
  const result: { androidHome?: string; javaHome?: string } = {};

  // First check process.env
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) {
    result.androidHome = process.env.ANDROID_HOME;
  }

  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    result.javaHome = process.env.JAVA_HOME;
  }

  // If not found in process.env, try config file
  if (!result.androidHome || !result.javaHome) {
    const envVars = loadEnvVarsFromFile();

    if (!result.androidHome) {
      const configAndroidHome = envVars['ANDROID_HOME'] || envVars['android_home'];
      if (configAndroidHome && fs.existsSync(configAndroidHome)) {
        result.androidHome = configAndroidHome;
      }
    }

    if (!result.javaHome) {
      const configJavaHome = envVars['JAVA_HOME'] || envVars['java_home'];
      if (configJavaHome && fs.existsSync(configJavaHome)) {
        result.javaHome = configJavaHome;
      }
    }
  }

  return result;
}
