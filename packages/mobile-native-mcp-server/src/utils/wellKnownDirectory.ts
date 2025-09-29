/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Well-Known Directory Management
 *
 * Centralized management of the .magen well-known directory structure for the
 * Mobile Native MCP Server. This directory contains persistent project artifacts
 * including workflow state, logging, and other cross-session data.
 *
 * Directory structure:
 * .magen/
 * ├── workflow-state.db    # SQLite database for LangGraph workflow persistence
 * ├── workflow_logs.json   # Structured JSON logs for workflow operations
 * └── [future artifacts]   # Additional project artifacts as needed
 */

import fs from 'fs';
import path from 'path';

/**
 * Well-known directory name - hidden directory at project root
 */
export const WELL_KNOWN_DIR_NAME = '.magen';

/**
 * Well-known file names within the .magen directory
 */
export const WELL_KNOWN_FILES = {
  WORKFLOW_STATE_STORE_FILENAME: 'workflow-state.json',
  WORKFLOW_LOGS: 'workflow_logs.json',
} as const;

/**
 * Get the absolute path to the .magen directory
 * Based on PROJECT_PATH environment variable (required)
 *
 * @returns Absolute path to .magen directory
 * @throws Error if PROJECT_PATH is not set
 */
export function getWellKnownDirectoryPath(): string {
  if (!process.env.PROJECT_PATH) {
    throw new Error('PROJECT_PATH environment variable is required but not set');
  }
  const wellKnownDir = path.resolve(process.env.PROJECT_PATH);
  return path.join(wellKnownDir, WELL_KNOWN_DIR_NAME);
}

/**
 * Ensure the .magen directory exists, creating it if necessary
 * Safe to call multiple times - idempotent operation
 *
 * @returns Absolute path to the .magen directory
 * @throws Error if directory creation fails
 */
export function ensureWellKnownDirectory(): string {
  const wellKnownDir = getWellKnownDirectoryPath();

  try {
    if (!fs.existsSync(wellKnownDir)) {
      fs.mkdirSync(wellKnownDir, { recursive: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to create .magen directory at "${wellKnownDir}": ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return wellKnownDir;
}

/**
 * Get the absolute path to a specific file within the .magen directory
 * Ensures the directory exists before returning the path
 *
 * @param fileName - Name of the file within .magen directory
 * @returns Absolute path to the specified file
 */
export function getWellKnownFilePath(fileName: string): string {
  const wellKnownDir = ensureWellKnownDirectory();
  return path.join(wellKnownDir, fileName);
}

/**
 * Convenience functions for common well-known files
 */

/**
 * Get the path to the workflow state database
 * @returns Absolute path to workflow-state.db
 */
export function getWorkflowStateStorePath(): string {
  return getWellKnownFilePath(WELL_KNOWN_FILES.WORKFLOW_STATE_STORE_FILENAME);
}

/**
 * Get the path to the workflow logs file
 * @returns Absolute path to workflow_logs.json
 */
export function getWorkflowLogsPath(): string {
  return getWellKnownFilePath(WELL_KNOWN_FILES.WORKFLOW_LOGS);
}

/**
 * Check if the .magen directory exists
 * @returns true if directory exists, false otherwise
 */
export function wellKnownDirectoryExists(): boolean {
  return fs.existsSync(getWellKnownDirectoryPath());
}

/**
 * Get information about the .magen directory and its contents
 * Useful for debugging and status reporting
 *
 * @returns Object with directory status and file information
 */
export function getWellKnownDirectoryInfo(): {
  exists: boolean;
  path: string;
  files: Array<{ name: string; exists: boolean; path: string }>;
} {
  const dirPath = getWellKnownDirectoryPath();
  const exists = wellKnownDirectoryExists();

  const files = Object.values(WELL_KNOWN_FILES).map(fileName => ({
    name: fileName,
    exists: exists && fs.existsSync(path.join(dirPath, fileName)),
    path: path.join(dirPath, fileName),
  }));

  return {
    exists,
    path: dirPath,
    files,
  };
}
