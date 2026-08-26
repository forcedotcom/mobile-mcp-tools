/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { TempDirectoryManager } from '../../src/common.js';
import { PlatformEnum } from '../../src/common/schemas.js';

/**
 * Mock TempDirectoryManager for testing that provides predictable paths
 */
export class MockTempDirectoryManager extends TempDirectoryManager {
  private readonly mockTempDir: string;
  private readonly mockIOSBuildOutputPath: string;
  private readonly mockAndroidBuildOutputPath: string;

  constructor(mockTempDir = '/tmp/mock-temp') {
    super();
    this.mockTempDir = mockTempDir;
    this.mockIOSBuildOutputPath = `${mockTempDir}/ios-app-build-output.txt`;
    this.mockAndroidBuildOutputPath = `${mockTempDir}/android-app-build-output.txt`;
  }

  override getTempWorkingDirectory(): string {
    return this.mockTempDir;
  }

  override getIOSBuildOutputFilePath(): string {
    return this.mockIOSBuildOutputPath;
  }

  override getAndroidBuildOutputFilePath(): string {
    return this.mockAndroidBuildOutputPath;
  }

  override getBuildOutputFilePath(platform: PlatformEnum): string {
    return platform === 'iOS' ? this.mockIOSBuildOutputPath : this.mockAndroidBuildOutputPath;
  }

  override getAppArtifactRootPath(projectName: string): string {
    return `${this.mockTempDir}/${projectName}`;
  }

  override getAppArtifactPath(projectName: string, platform: PlatformEnum): string {
    const extension = platform === 'iOS' ? '.app' : '.apk';
    return `${this.mockTempDir}/${projectName}/${projectName}${extension}`;
  }
}
