/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ProgressReporter } from './progressReporter.js';

/**
 * Command structure for execution
 */
export interface Command {
  executable: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

/**
 * Result of command execution
 */
export interface CommandResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  success: boolean;
  duration: number;
}

/**
 * Progress parse result
 */
export interface ProgressParseResult {
  progress: number;
  message?: string;
}

/**
 * Function type for parsing progress from command output
 */
export type ProgressParser = (output: string, currentProgress: number) => ProgressParseResult;

/**
 * Command execution options
 */
export interface CommandExecutionOptions {
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  cwd?: string;
  progressParser?: ProgressParser;
  progressReporter?: ProgressReporter;
  outputFilePath?: string;
  /**
   * Human-readable name for the command being executed.
   * Used in progress messages to make them more specific.
   * Example: "Project Generation", "iOS Build", "Android Build"
   */
  commandName: string;
  /**
   * Debounce time in milliseconds for reporting identical progress values.
   * Defaults to 2000ms (2 seconds). Progress changes are always reported immediately.
   */
  progressDebounceMs?: number;
}
