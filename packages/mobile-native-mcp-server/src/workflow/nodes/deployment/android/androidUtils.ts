/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Logger } from '@salesforce/magen-mcp-workflow';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads applicationId from build.gradle or build.gradle.kts file.
 * Returns undefined if not found (caller should handle fallback).
 */
export function readApplicationIdFromGradle(
  projectPath: string,
  logger: Logger
): string | undefined {
  const gradleFiles = [
    join(projectPath, 'app', 'build.gradle'),
    join(projectPath, 'app', 'build.gradle.kts'),
  ];

  for (const gradleFile of gradleFiles) {
    try {
      const content = readFileSync(gradleFile, 'utf-8');
      // Match applicationId patterns: applicationId = "com.example.app" or applicationId "com.example.app"
      const applicationIdPattern = /applicationId\s*[=:]\s*["']([^"']+)["']/;
      const match = applicationIdPattern.exec(content);
      if (match?.[1]) {
        logger.debug('Found applicationId in build.gradle', {
          file: gradleFile,
          applicationId: match[1],
        });
        return match[1];
      }
    } catch {
      // File doesn't exist or can't be read, try next file
      continue;
    }
  }

  return undefined;
}

/**
 * Reads the launcher activity class name from AndroidManifest.xml.
 * Looks for an activity with android.intent.category.LAUNCHER intent-filter.
 * Returns undefined if not found.
 */
export function readLaunchActivityFromManifest(
  projectPath: string,
  logger: Logger
): string | undefined {
  try {
    const manifestPath = join(projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');
    const content = readFileSync(manifestPath, 'utf-8');

    // Find activity blocks that contain the LAUNCHER category
    // Pattern matches: <activity android:name=".MainActivity" ...> ... <category android:name="android.intent.category.LAUNCHER" /> ... </activity>
    const activityPattern =
      /<activity[^>]*android:name\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<category\s+android:name\s*=\s*["']android\.intent\.category\.LAUNCHER["']\s*\/>[\s\S]*?<\/activity>/g;

    const match = activityPattern.exec(content);
    if (match?.[1]) {
      logger.debug('Found launcher activity in AndroidManifest.xml', {
        activityName: match[1],
      });
      return match[1];
    }

    // Alternative pattern: activity name might come after other attributes
    const altPattern =
      /<activity[^>]*>[\s\S]*?<category\s+android:name\s*=\s*["']android\.intent\.category\.LAUNCHER["']\s*\/>[\s\S]*?<\/activity>/g;
    let activityBlock: RegExpExecArray | null;
    while ((activityBlock = altPattern.exec(content)) !== null) {
      const namePattern = /android:name\s*=\s*["']([^"']+)["']/;
      const nameMatch = namePattern.exec(activityBlock[0]);
      if (nameMatch?.[1]) {
        logger.debug('Found launcher activity in AndroidManifest.xml (alt pattern)', {
          activityName: nameMatch[1],
        });
        return nameMatch[1];
      }
    }

    logger.debug('No launcher activity found in AndroidManifest.xml');
  } catch (error) {
    logger.debug('Error reading AndroidManifest.xml', { error });
  }

  return undefined;
}

/**
 * Constructs the APK path based on standard Gradle output location.
 * The path follows the pattern: app/build/outputs/apk/{buildType}/app-{buildType}.apk
 *
 * @param projectPath - The root path of the Android project
 * @param buildType - The build type (e.g., 'debug', 'release'). Defaults to 'debug' if not provided.
 * @returns The full path to the APK file
 */
export function getApkPath(projectPath: string, buildType: string = 'debug'): string {
  return join(projectPath, 'app', 'build', 'outputs', 'apk', buildType, `app-${buildType}.apk`);
}
