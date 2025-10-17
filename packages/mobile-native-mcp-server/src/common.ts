/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PlatformEnum } from './common/schemas.js';
import { FileSystemProvider, defaultFileSystemProvider } from './utils/FileSystemProvider.js';

// Shared template source path for Salesforce Mobile SDK commands
export const MOBILE_SDK_TEMPLATES_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'templates'
);

/**
 * Manages temporary directory creation and cleanup for workflow artifacts and logs.
 * Uses dependency injection for file system operations to support testing.
 */
export class TempDirectoryManager {
  private tempWorkingDirectory: string | undefined;
  private readonly fs: FileSystemProvider;

  constructor(fileSystemProvider: FileSystemProvider = defaultFileSystemProvider) {
    this.fs = fileSystemProvider;
  }

  /**
   * Gets the temp working directory, creating it lazily on first access.
   * @returns The path to the temp working directory
   */
  getTempWorkingDirectory(): string {
    if (!this.tempWorkingDirectory) {
      const prefix = join(this.fs.tmpdir(), 'magen-temp-');
      this.tempWorkingDirectory = this.fs.mkdtempSync(prefix);
    }
    return this.tempWorkingDirectory;
  }

  /**
   * Cleans up the temp working directory if it exists.
   * @param force If true, removes the directory even if it contains files (default: true)
   */
  cleanup(force = true): void {
    if (this.tempWorkingDirectory) {
      try {
        this.fs.rmSync(this.tempWorkingDirectory, { recursive: true, force });
        this.tempWorkingDirectory = undefined;
      } catch {
        // Ignore errors during cleanup
      }
    }
  }

  /**
   * Gets the path to the build output file for an iOS app build.
   * @returns The full path to the iOS build output file
   */
  getIOSBuildOutputFilePath(): string {
    return join(this.getTempWorkingDirectory(), 'ios-app-build-output.txt');
  }

  /**
   * Gets the path to the build output file for an Android app build.
   * @returns The full path to the Android build output file
   */
  getAndroidBuildOutputFilePath(): string {
    return join(this.getTempWorkingDirectory(), 'android-app-build-output.txt');
  }

  /**
   * Gets the path to the build output file based on platform.
   * @param platform The platform of the app (iOS or Android)
   * @returns The full path to the build output file
   */
  getBuildOutputFilePath(platform: PlatformEnum): string {
    return platform === 'iOS'
      ? this.getIOSBuildOutputFilePath()
      : this.getAndroidBuildOutputFilePath();
  }

  /**
   * Gets the build output "root directory" for an app bundle/artifact
   * @param projectName The name of the project will be used as the umbrella directory name
   * @returns The full path to the app artifact root directory
   */
  getAppArtifactRootPath(projectName: string): string {
    return join(this.getTempWorkingDirectory(), projectName);
  }

  /**
   * Gets the path to the app artifact itself (e.g. MyiOSApp.app or MyAndroidApp.apk)
   * @param projectName The name of the project, which is the root of the artifact name.
   * @param platform The platform of the app, which will determine the suffix of the artifact name.
   * @returns The full path to the app artifact
   */
  getAppArtifactPath(projectName: string, platform: PlatformEnum): string {
    return join(
      this.getAppArtifactRootPath(projectName),
      platform === 'iOS' ? `${projectName}.app` : `${projectName}.apk`
    );
  }
}

/**
 * Default singleton instance for production use
 */
export const defaultTempDirectoryManager = new TempDirectoryManager();
