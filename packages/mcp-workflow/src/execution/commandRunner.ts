/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { Logger, createComponentLogger } from '../logging/logger.js';
import type { CommandResult, CommandExecutionOptions } from './types.js';

/**
 * Generic command execution abstraction that handles process spawning,
 * output capture, and progress reporting.
 */
export interface CommandRunner {
  /**
   * Executes a command and returns the result.
   *
   * @param command - Command to execute
   * @param args - Command arguments
   * @param options - Execution options
   * @returns Command execution result
   */
  execute(
    command: string,
    args: string[],
    options?: CommandExecutionOptions
  ): Promise<CommandResult>;
}

/**
 * Default implementation of CommandRunner using Node.js spawn.
 */
export class DefaultCommandRunner implements CommandRunner {
  private readonly logger: Logger;
  private readonly defaultTimeout: number;
  private static readonly PROGRESS_TOTAL = 100;
  private static readonly DEFAULT_PROGRESS_DEBOUNCE_MS = 2000;

  constructor(logger?: Logger, defaultTimeout: number = 300000) {
    this.logger = logger ?? createComponentLogger('CommandRunner');
    this.defaultTimeout = defaultTimeout;
  }

  async execute(
    command: string,
    args: string[],
    options: CommandExecutionOptions = {}
  ): Promise<CommandResult> {
    const {
      env: providedEnv = process.env,
      timeout = this.defaultTimeout,
      cwd,
      progressParser,
      progressReporter,
      outputFilePath,
      progressDebounceMs = DefaultCommandRunner.DEFAULT_PROGRESS_DEBOUNCE_MS,
    } = options;

    // Ensure UTF-8 encoding environment variables are set for tools like CocoaPods
    // Allow overrides if explicitly provided in env
    const env = {
      ...providedEnv,
      LANG: providedEnv.LANG || 'en_US.UTF-8',
      LC_ALL: providedEnv.LC_ALL || 'en_US.UTF-8',
    };

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let currentProgress = 0;
    let lastReportedProgress: number | null = null;
    let lastReportTime: number | null = null;

    return new Promise<CommandResult>((resolve, reject) => {
      const outputStream = outputFilePath ? createWriteStream(outputFilePath) : null;

      const childProcess = spawn(command, args, {
        env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd,
      });

      // Initialize progress reporting
      if (progressReporter) {
        progressReporter.report(
          0,
          DefaultCommandRunner.PROGRESS_TOTAL,
          'Starting command execution...'
        );
      }

      // Capture stdout and report progress on each chunk to keep task alive
      childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        stdout += text;
        outputStream?.write(text);

        // Report progress on each stdout chunk to keep task alive
        if (progressReporter) {
          const elapsed = Date.now() - startTime;
          const elapsedSeconds = Math.floor(elapsed / 1000);
          const now = Date.now();

          // Parse progress if parser provided
          if (progressParser) {
            try {
              const parseResult = progressParser(stdout, currentProgress);
              if (parseResult.progress > currentProgress) {
                currentProgress = parseResult.progress;
              }

              // Check if we should report: always report if progress changed, or if debounce time elapsed
              const progressChanged = lastReportedProgress !== currentProgress;
              const debounceElapsed =
                lastReportTime === null || now - lastReportTime >= progressDebounceMs;

              if (progressChanged || debounceElapsed) {
                progressReporter.report(
                  currentProgress,
                  DefaultCommandRunner.PROGRESS_TOTAL,
                  parseResult.message || `Command in progress... (${elapsedSeconds}s elapsed)`
                );
                lastReportedProgress = currentProgress;
                lastReportTime = now;
              }
            } catch (_error) {
              // If parsing fails, still report progress to keep task alive
              const progressChanged = lastReportedProgress !== currentProgress;
              const debounceElapsed =
                lastReportTime === null || now - lastReportTime >= progressDebounceMs;

              if (progressChanged || debounceElapsed) {
                progressReporter.report(
                  currentProgress,
                  DefaultCommandRunner.PROGRESS_TOTAL,
                  `Command in progress... (${elapsedSeconds}s elapsed)`
                );
                lastReportedProgress = currentProgress;
                lastReportTime = now;
              }
            }
          } else {
            // No parser - just report activity to keep task alive
            const progressChanged = lastReportedProgress !== currentProgress;
            const debounceElapsed =
              lastReportTime === null || now - lastReportTime >= progressDebounceMs;

            if (progressChanged || debounceElapsed) {
              progressReporter.report(
                currentProgress,
                DefaultCommandRunner.PROGRESS_TOTAL,
                `Command in progress... (${elapsedSeconds}s elapsed)`
              );
              lastReportedProgress = currentProgress;
              lastReportTime = now;
            }
          }
        }
      });

      // Capture stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf-8');
        stderr += text;
        outputStream?.write(text);
      });

      // Handle process completion
      childProcess.on('exit', (code, signal) => {
        outputStream?.end();

        const duration = Date.now() - startTime;
        const success = code === 0;

        if (progressReporter) {
          if (success) {
            progressReporter.report(
              DefaultCommandRunner.PROGRESS_TOTAL,
              DefaultCommandRunner.PROGRESS_TOTAL,
              'Command completed successfully'
            );
          } else {
            const errorMsg = signal
              ? `Command terminated by signal: ${signal}`
              : `Command failed with exit code: ${code}`;
            progressReporter.report(
              DefaultCommandRunner.PROGRESS_TOTAL,
              DefaultCommandRunner.PROGRESS_TOTAL,
              errorMsg
            );
          }
        }

        resolve({
          exitCode: code,
          signal: signal ?? null,
          stdout,
          stderr,
          success,
          duration,
        });
      });

      // Handle process errors
      childProcess.on('error', error => {
        outputStream?.end();

        if (progressReporter) {
          progressReporter.report(
            DefaultCommandRunner.PROGRESS_TOTAL,
            DefaultCommandRunner.PROGRESS_TOTAL,
            `Command execution error: ${error.message}`
          );
        }

        reject(error);
      });

      // Set timeout
      if (timeout > 0) {
        const timeoutTimer = setTimeout(() => {
          if (childProcess.exitCode === null) {
            childProcess.kill('SIGTERM');
            const duration = Date.now() - startTime;
            reject(
              new Error(
                `Command timeout after ${timeout}ms (${Math.floor(duration / 1000)}s elapsed)`
              )
            );
          }
        }, timeout);

        childProcess.on('exit', () => {
          clearTimeout(timeoutTimer);
        });
      }
    });
  }
}
