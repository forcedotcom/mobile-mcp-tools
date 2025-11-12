/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { FileSystemOperations } from '@salesforce/magen-mcp-workflow';
import fs from 'fs';

/**
 * Mock implementation of FileSystemOperations for testing
 * Allows tests to control directory paths without creating real directories
 * Tracks calls for verification
 */
export class MockFileSystemOperations implements FileSystemOperations {
  private mockTempDir: string;
  private tempDirCounter = 0;
  private existingFiles = new Set<string>();
  public rmSyncCalls: Array<{ path: string; options?: { recursive?: boolean; force?: boolean } }> =
    [];

  constructor(mockTempDir = '/mock/temp/dir') {
    this.mockTempDir = mockTempDir;
  }

  existsSync(filePath: string): boolean {
    return this.existingFiles.has(filePath);
  }

  mkdirSync(_path: string, _options?: fs.MakeDirectoryOptions): void {
    // No-op for testing
  }

  mkdtempSync(prefix: string): string {
    // Return a predictable mock path without creating real directories
    this.tempDirCounter++;
    return `${prefix}${this.tempDirCounter}`;
  }

  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    // Track the call for verification in tests
    this.rmSyncCalls.push({ path, options });
  }

  tmpdir(): string {
    return this.mockTempDir;
  }

  // Async methods - not used in current tests, but required by interface
  async access(_path: string): Promise<void> {
    // No-op for testing
  }

  async readFile(_path: string, _encoding: BufferEncoding): Promise<string> {
    return '';
  }

  async writeFile(_path: string, _data: string, _encoding: BufferEncoding): Promise<void> {
    // No-op for testing
  }

  async rename(_oldPath: string, _newPath: string): Promise<void> {
    // No-op for testing
  }

  async unlink(_path: string): Promise<void> {
    // No-op for testing
  }

  async mkdir(_path: string, _options?: fs.MakeDirectoryOptions): Promise<void> {
    // No-op for testing
  }

  async stat(_path: string): Promise<fs.Stats> {
    throw new Error('Not implemented in mock');
  }

  /**
   * Set which files should be considered as existing
   */
  setExistingFiles(filePaths: string[]): void {
    this.existingFiles.clear();
    filePaths.forEach(path => this.existingFiles.add(path));
  }

  /**
   * Add a file to the existing files set
   */
  addExistingFile(filePath: string): void {
    this.existingFiles.add(filePath);
  }

  /**
   * Clear all existing files
   */
  clearExistingFiles(): void {
    this.existingFiles.clear();
  }

  /**
   * Reset the counter and call tracking for predictable test behavior
   */
  reset(): void {
    this.tempDirCounter = 0;
    this.rmSyncCalls = [];
    this.existingFiles.clear();
  }
}
