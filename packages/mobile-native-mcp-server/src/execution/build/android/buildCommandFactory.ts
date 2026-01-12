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
 * Gradle progress patterns
 * Ordered by phase: initialization -> configuration -> compilation -> packaging -> assembly
 */
const ANDROID_PROGRESS_PATTERNS: ProgressPattern[] = [
  // Build completion (checked first, breaks on match)
  { pattern: /BUILD SUCCESSFUL/g, weight: PROGRESS_COMPLETE },
  { pattern: /BUILD FAILED/g, weight: PROGRESS_FAILURE },

  // Initialization phase
  { pattern: /Starting a Gradle Daemon/g, weight: 0.5 },

  // Configuration phase
  { pattern: /> Configure project :(\S+)/g, weight: 0.5 },

  // Task execution - general tasks (checked early, may be overridden by specific patterns)
  { pattern: /> Task :(\S+):(\S+)/g, weight: 1 },

  // Task completion indicators (more specific than general task pattern)
  { pattern: /> Task :(\S+):(\S+) (UP-TO-DATE|SKIPPED|NO-SOURCE)/g, weight: 0.3 },

  // Compilation phase milestones (more specific than general task pattern)
  { pattern: /> Task :(\S+):compile(\S+)/g, weight: 2 },

  // Packaging phase milestones (more specific than general task pattern)
  { pattern: /> Task :(\S+):package(\S+)/g, weight: 3 },

  // Final assembly milestones (most specific, checked last to override others)
  { pattern: /> Task :app:assemble(Debug|Release)/g, weight: 5 },
];

/**
 * Android build command factory.
 * Creates Gradle build commands and parses Gradle output for progress.
 */
export class AndroidBuildCommandFactory implements BuildCommandFactory {
  create(params: BuildCommandParams): Command {
    return {
      executable: 'sh',
      args: ['-c', `cd "${params.projectPath}" && ./gradlew build`],
      env: process.env,
      cwd: params.projectPath,
    };
  }

  parseProgress(output: string, currentProgress: number): ProgressParseResult {
    return parseProgressWithPatterns(
      output,
      currentProgress,
      ANDROID_PROGRESS_PATTERNS,
      lastMatch => {
        const fullMatch = lastMatch[0];

        // Handle different pattern types
        if (fullMatch.includes('Starting a Gradle Daemon')) {
          return 'Initializing Gradle daemon...';
        }

        if (fullMatch.includes('Configure project')) {
          const project = lastMatch[1] || 'project';
          return `Configuring project: ${project}`;
        }

        if (fullMatch.includes('assemble')) {
          // Pattern: /> Task :app:assemble(Debug|Release)/g captures variant in group 1
          const variant = lastMatch[1] || 'app';
          return `Assembling ${variant} build...`;
        }

        if (fullMatch.includes('package')) {
          const module = lastMatch[1] || 'module';
          const variant = lastMatch[2] || '';
          return `Packaging ${module}${variant ? ` (${variant})` : ''}...`;
        }

        if (fullMatch.includes('compile')) {
          const module = lastMatch[1] || 'module';
          const variant = lastMatch[2] || '';
          return `Compiling ${module}${variant ? ` (${variant})` : ''}...`;
        }

        if (
          fullMatch.includes('UP-TO-DATE') ||
          fullMatch.includes('SKIPPED') ||
          fullMatch.includes('NO-SOURCE')
        ) {
          const module = lastMatch[1] || 'module';
          const task = lastMatch[2] || 'task';
          const status = lastMatch[3] || '';
          return `${module}:${task} ${status}`;
        }

        // Default: general task execution
        const module = lastMatch[1] || 'module';
        const task = lastMatch[2] || 'in progress';
        return `Building: ${module}:${task}`;
      }
    );
  }
}
