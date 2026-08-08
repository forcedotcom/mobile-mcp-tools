/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import type { Command, ProgressParseResult } from '@salesforce/magen-mcp-workflow';
import {
  BuildCommandFactory,
  BuildCommandParams,
  ProgressPattern,
  PROGRESS_COMPLETE,
  PROGRESS_FAILURE,
  parseProgressWithPatterns,
} from '../types.js';

/**
 * xcodebuild progress patterns
 */
const IOS_PROGRESS_PATTERNS: ProgressPattern[] = [
  { pattern: /Compiling\s+(\S+)/g, weight: 2 },
  { pattern: /Linking\s+(\S+)/g, weight: 3 },
  { pattern: /CodeSign\s+(\S+)/g, weight: 2 },
  { pattern: /BUILD SUCCEEDED/g, weight: PROGRESS_COMPLETE },
  { pattern: /BUILD FAILED/g, weight: PROGRESS_FAILURE },
];

/**
 * iOS build command factory.
 * Creates xcodebuild commands and parses xcodebuild output for progress.
 */
export class iOSBuildCommandFactory implements BuildCommandFactory {
  create(params: BuildCommandParams): Command {
    const env = {
      ...process.env,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    };

    // Build xcodebuild as an executable + argv array so no value (projectPath, projectName,
    // buildOutputDir) is ever parsed by a shell. The working directory is set via `cwd`
    // (commandRunner honors it), replacing the previous `cd "…" &&` shell prefix.
    return {
      executable: 'xcodebuild',
      args: [
        '-workspace',
        `${params.projectName}.xcworkspace`,
        '-scheme',
        params.projectName,
        '-destination',
        'generic/platform=iOS Simulator',
        'clean',
        'build',
        `CONFIGURATION_BUILD_DIR=${params.buildOutputDir}`,
      ],
      env,
      cwd: params.projectPath,
    };
  }

  parseProgress(output: string, currentProgress: number): ProgressParseResult {
    return parseProgressWithPatterns(
      output,
      currentProgress,
      IOS_PROGRESS_PATTERNS,
      lastMatch => `Building: ${lastMatch[1] || 'in progress'}`
    );
  }
}
