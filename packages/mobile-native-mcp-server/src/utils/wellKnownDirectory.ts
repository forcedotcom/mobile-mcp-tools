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
import os from 'os';

/**
 * Well-known directory name - hidden directory at project root
 */
export const WELL_KNOWN_DIR_NAME = '.magen';

/**
 * Well-known directory names for project-specific directories
 */
export const PROJECT_WELL_KNOWN_DIRS = {
  MAGI_SDD: 'magi-sdd',
} as const;

/**
 * Well-known file names within the .magen directory
 */
export const WELL_KNOWN_FILES = {
  WORKFLOW_STATE_STORE_FILENAME: 'workflow-state.json',
  WORKFLOW_LOGS: 'workflow_logs.json',
} as const;

/**
 * Get the absolute path to the .magen directory
 * Based on user's home directory by default
 *
 * @returns Absolute path to .magen directory
 */
export function getWellKnownDirectoryPath(): string {
  const wellKnownDir = process.env.PROJECT_PATH
    ? path.resolve(process.env.PROJECT_PATH)
    : os.homedir();
  return path.join(wellKnownDir, WELL_KNOWN_DIR_NAME);
}

/**
 * Ensure the .magen directory exists, creating it if necessary
 * Safe to call multiple times - idempotent operation
 *
 * @returns Absolute path to the .magen directory
 */
export function ensureWellKnownDirectory(): string {
  const wellKnownDir = getWellKnownDirectoryPath();

  if (!fs.existsSync(wellKnownDir)) {
    fs.mkdirSync(wellKnownDir, { recursive: true });
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

/**
 * Ensure a specific well-known directory exists within a project path
 * Safe to call multiple times - idempotent operation
 *
 * @param projectPath - The project root path
 * @param directoryName - Name of the directory to create/verify
 * @returns Absolute path to the directory
 */
export function ensureProjectWellKnownDirectory(
  projectPath: string,
  directoryName: string
): string {
  const fullPath = path.join(projectPath, directoryName);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}

/**
 * Ensure the magi-sdd directory exists within a project path
 * Safe to call multiple times - idempotent operation
 *
 * @param projectPath - The project root path
 * @returns Absolute path to the magi-sdd directory
 */
export function ensureMagiSddDirectory(projectPath: string): string {
  return ensureProjectWellKnownDirectory(projectPath, PROJECT_WELL_KNOWN_DIRS.MAGI_SDD);
}

/**
 * Get existing feature IDs by scanning feature directories in the magi-sdd directory
 * Returns an array of feature IDs (without the number prefix)
 *
 * @param magiSddPath - Path to the magi-sdd directory
 * @returns Array of existing feature IDs
 */
export function getExistingFeatureIds(magiSddPath: string): string[] {
  if (!fs.existsSync(magiSddPath)) {
    return [];
  }

  const entries = fs.readdirSync(magiSddPath, { withFileTypes: true });
  const featureIds = entries
    .filter(entry => entry.isDirectory() && /^\d{3}-/.test(entry.name))
    .map(entry => {
      const match = entry.name.match(/^\d{3}-(.+)$/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null);

  return featureIds;
}

/**
 * Get the next available feature number by scanning existing feature directories
 * in the magi-sdd directory. Returns 1 if no features exist yet.
 *
 * @param magiSddPath - Path to the magi-sdd directory
 * @returns Next available feature number (e.g., 1, 2, 3, etc.)
 */
export function getNextFeatureNumber(magiSddPath: string): number {
  if (!fs.existsSync(magiSddPath)) {
    return 1;
  }

  const entries = fs.readdirSync(magiSddPath, { withFileTypes: true });
  const featureDirs = entries
    .filter(entry => entry.isDirectory() && /^\d{3}-/.test(entry.name))
    .map(entry => {
      const match = entry.name.match(/^(\d{3})-/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => num > 0)
    .sort((a, b) => b - a); // Sort descending to find highest number

  return featureDirs.length > 0 ? featureDirs[0] + 1 : 1;
}

/**
 * Find an existing feature directory by feature ID
 * Scans the magi-sdd directory for directories matching the pattern "xxx-featureId"
 *
 * @param magiSddPath - Path to the magi-sdd directory
 * @param featureId - The feature ID to search for (without the number prefix)
 * @returns Absolute path to the existing feature directory, or null if not found
 */
export function findExistingFeatureDirectory(
  magiSddPath: string,
  featureId: string
): string | null {
  if (!fs.existsSync(magiSddPath)) {
    return null;
  }

  const entries = fs.readdirSync(magiSddPath, { withFileTypes: true });
  const matchingDir = entries.find(
    entry =>
      entry.isDirectory() && entry.name.endsWith(`-${featureId}`) && /^\d{3}-/.test(entry.name)
  );

  return matchingDir ? path.join(magiSddPath, matchingDir.name) : null;
}

/**
 * Create a new feature directory with the format "00x-feature-id"
 * where 00x is the next available number padded to 3 digits
 * Or reuse an existing directory if one exists for the featureId
 *
 * @param magiSddPath - Path to the magi-sdd directory
 * @param featureId - The feature ID in kebab-case
 * @param reuseExisting - If true, will reuse an existing directory if found. Default: true
 * @returns Absolute path to the feature directory
 */
export function createFeatureDirectory(
  magiSddPath: string,
  featureId: string,
  reuseExisting = true
): string {
  // Validate feature ID format
  if (!/^[a-z0-9-]+$/.test(featureId)) {
    throw new Error(
      `Invalid feature ID format: "${featureId}". Must be in kebab-case (lowercase letters, numbers, and hyphens only)`
    );
  }

  // Check if we should reuse an existing directory
  if (reuseExisting) {
    const existingDir = findExistingFeatureDirectory(magiSddPath, featureId);
    if (existingDir) {
      return existingDir;
    }
  }

  // Create a new directory with the next available number
  const nextNumber = getNextFeatureNumber(magiSddPath);
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  const featureDirName = `${paddedNumber}-${featureId}`;
  const featureDirPath = path.join(magiSddPath, featureDirName);

  // Create the feature directory
  fs.mkdirSync(featureDirPath, { recursive: true });

  return featureDirPath;
}

/**
 * Get the PRD workspace path (magi-sdd directory) from project path
 *
 * @param projectPath - The project root path
 * @returns Path to the magi-sdd directory
 */
export function getPrdWorkspacePath(projectPath: string): string {
  return path.join(projectPath, PROJECT_WELL_KNOWN_DIRS.MAGI_SDD);
}

/**
 * Resolve the feature directory path for a PRD workflow
 * Determines the feature directory from projectPath and featureId
 *
 * @param projectPath - The project root path
 * @param featureId - The feature ID (without number prefix)
 * @returns Path to feature directory, or null if cannot be determined
 */
export function resolveFeatureDirectoryFromIds(
  projectPath: string,
  featureId: string
): string | null {
  if (!projectPath || !featureId) {
    return null;
  }

  const magiSddPath = getPrdWorkspacePath(projectPath);
  const existingDir = findExistingFeatureDirectory(magiSddPath, featureId);
  if (existingDir) {
    return existingDir;
  }

  // If directory doesn't exist yet, we can't determine the exact path
  // (since it includes the number prefix). Caller should use createFeatureDirectory instead.
  return null;
}

/**
 * Resolve the feature directory path for a PRD workflow
 * Determines the feature directory from workflow state
 * Supports both new format (projectPath + featureId) and legacy format (with paths in state)
 *
 * @param state - PRD workflow state with projectPath, featureId, and optionally legacy paths
 * @returns Path to feature directory, or null if cannot be determined
 */
export function resolveFeatureDirectory(state: {
  projectPath?: string;
  featureId?: string;
  featureBriefPath?: string;
  prdWorkspacePath?: string;
}): string | null {
  // New format: use projectPath and featureId
  if (state.projectPath && state.featureId) {
    return resolveFeatureDirectoryFromIds(state.projectPath, state.featureId);
  }

  // Legacy format: fall back to old logic for backward compatibility
  if (state.featureBriefPath && fs.existsSync(path.dirname(state.featureBriefPath))) {
    return path.dirname(state.featureBriefPath);
  } else if (state.featureId && state.prdWorkspacePath) {
    const existingDir = findExistingFeatureDirectory(state.prdWorkspacePath, state.featureId);
    if (existingDir) {
      return existingDir;
    } else {
      return path.join(state.prdWorkspacePath, state.featureId);
    }
  }

  return null;
}

/**
 * Magi artifact types that can be stored in feature directories
 */
export const MAGI_ARTIFACTS = {
  PRD: 'prd',
  FEATURE_BRIEF: 'feature-brief',
  REQUIREMENTS: 'requirements',
} as const;

export type MagiArtifact = (typeof MAGI_ARTIFACTS)[keyof typeof MAGI_ARTIFACTS];

/**
 * Artifact filename mapping for each artifact type
 */
const ARTIFACT_FILENAMES: Record<MagiArtifact, string> = {
  [MAGI_ARTIFACTS.PRD]: 'PRD.md',
  [MAGI_ARTIFACTS.FEATURE_BRIEF]: 'feature-brief.md',
  [MAGI_ARTIFACTS.REQUIREMENTS]: 'requirements.md',
};

/**
 * Get the path to a Magi artifact file from project path and feature ID
 *
 * @param projectPath - The project root path
 * @param featureId - The feature ID (without number prefix)
 * @param artifact - The artifact type to get the path for
 * @returns Path to the artifact file
 */
export function getMagiPath(
  projectPath: string,
  featureId: string,
  artifact: MagiArtifact
): string {
  const featureDirectory = resolveFeatureDirectoryFromIds(projectPath, featureId);
  if (!featureDirectory) {
    throw new Error(
      `Cannot determine feature directory for featureId: ${featureId}. Feature directory may not exist yet.`
    );
  }
  const filename = ARTIFACT_FILENAMES[artifact];
  return path.join(featureDirectory, filename);
}

/**
 * Resolve the requirements artifact path for a feature
 * Returns the path to requirements.md in the feature directory
 *
 * @param featureDirectory - Path to the feature directory
 * @returns Path to requirements.md file
 */
export function resolveRequirementsArtifactPath(featureDirectory: string): string {
  return path.join(featureDirectory, 'requirements.md');
}

/**
 * Read a Magi artifact file content
 * Uses getMagiPath to resolve the artifact path, then reads the file if it exists
 *
 * @param projectPath - The project root path
 * @param featureId - The feature ID (without number prefix)
 * @param artifact - The artifact type to read
 * @returns Artifact content, or empty string if file doesn't exist or cannot be resolved
 */
export function readMagiArtifact(
  projectPath: string,
  featureId: string,
  artifact: MagiArtifact
): string {
  try {
    const artifactPath = getMagiPath(projectPath, featureId, artifact);
    if (fs.existsSync(artifactPath)) {
      return fs.readFileSync(artifactPath, 'utf8');
    }
  } catch {
    // Artifact may not exist yet or feature directory may not be resolved
  }

  return '';
}

/**
 * Write a Magi artifact file content
 * Uses getMagiPath to resolve the artifact path, ensures directory exists, then writes the file
 *
 * @param projectPath - The project root path
 * @param featureId - The feature ID (without number prefix)
 * @param artifact - The artifact type to write
 * @param content - The content to write to the file
 * @returns The path to the written file
 * @throws Error if the feature directory cannot be resolved
 */
export function writeMagiArtifact(
  projectPath: string,
  featureId: string,
  artifact: MagiArtifact,
  content: string
): string {
  const artifactPath = getMagiPath(projectPath, featureId, artifact);

  // Ensure the directory exists before writing the file
  const artifactDirectory = path.dirname(artifactPath);
  if (!fs.existsSync(artifactDirectory)) {
    fs.mkdirSync(artifactDirectory, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(artifactPath, content, 'utf8');

  return artifactPath;
}
