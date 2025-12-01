/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import path from 'path';
import type { FileSystemOperations } from '../../src/common/fileSystem.js';

/**
 * Mock filesystem implementation for testing
 * Provides an in-memory filesystem that implements FileSystemOperations interface
 */
export class MockFileSystem implements FileSystemOperations {
  private files = new Map<string, string>();
  private directories = new Set<string>();
  private mkdirCalls: Array<{ path: string; options?: fs.MakeDirectoryOptions; isSync: boolean }> =
    [];
  private tempDirCounter = 0;

  // Synchronous operations
  existsSync(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }

  mkdirSync(dirPath: string, options?: fs.MakeDirectoryOptions): void {
    this.mkdirCalls.push({ path: dirPath, options, isSync: true });
    this.createDirectory(dirPath, options);
  }

  mkdtempSync(prefix: string): string {
    // Create a unique temp directory path with the given prefix
    const tempDir = `${prefix}${Date.now()}-${this.tempDirCounter++}`;
    this.createDirectory(tempDir);
    return tempDir;
  }

  rmSync(targetPath: string, options?: { recursive?: boolean; force?: boolean }): void {
    const exists = this.files.has(targetPath) || this.directories.has(targetPath);

    if (!exists && !options?.force) {
      const error: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, rm '${targetPath}'`
      );
      error.code = 'ENOENT';
      throw error;
    }

    if (options?.recursive) {
      // Remove files and directories that start with this path
      const pathPrefix = targetPath.endsWith(path.sep) ? targetPath : targetPath + path.sep;

      // Remove matching files
      for (const filePath of this.files.keys()) {
        if (filePath === targetPath || filePath.startsWith(pathPrefix)) {
          this.files.delete(filePath);
        }
      }

      // Remove matching directories
      for (const dirPath of this.directories) {
        if (dirPath === targetPath || dirPath.startsWith(pathPrefix)) {
          this.directories.delete(dirPath);
        }
      }
    } else {
      // Non-recursive: only remove if it's a file or empty directory
      this.files.delete(targetPath);
      this.directories.delete(targetPath);
    }
  }

  tmpdir(): string {
    // Return a mock temp directory path
    return path.resolve('/tmp');
  }

  // Asynchronous operations
  async access(path: string): Promise<void> {
    if (!this.files.has(path) && !this.directories.has(path)) {
      const error: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, access '${path}'`
      );
      error.code = 'ENOENT';
      throw error;
    }
  }

  async readFile(path: string, _encoding: BufferEncoding): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      const error: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, open '${path}'`
      );
      error.code = 'ENOENT';
      throw error;
    }
    return content;
  }

  async writeFile(path: string, data: string, _encoding: BufferEncoding): Promise<void> {
    this.files.set(path, data);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const content = this.files.get(oldPath);
    if (content === undefined) {
      const error: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`
      );
      error.code = 'ENOENT';
      throw error;
    }
    this.files.set(newPath, content);
    this.files.delete(oldPath);
  }

  async unlink(path: string): Promise<void> {
    if (!this.files.has(path)) {
      const error: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, unlink '${path}'`
      );
      error.code = 'ENOENT';
      throw error;
    }
    this.files.delete(path);
  }

  async mkdir(dirPath: string, options?: fs.MakeDirectoryOptions): Promise<void> {
    this.mkdirCalls.push({ path: dirPath, options, isSync: false });
    this.createDirectory(dirPath, options);
  }

  async stat(path: string): Promise<fs.Stats> {
    if (this.files.has(path)) {
      // Return a mock Stats object for files
      return {
        isFile: () => true,
        isDirectory: () => false,
      } as fs.Stats;
    } else if (this.directories.has(path)) {
      // Return a mock Stats object for directories
      return {
        isFile: () => false,
        isDirectory: () => true,
      } as fs.Stats;
    } else {
      const error: NodeJS.ErrnoException = new Error(
        `ENOENT: no such file or directory, stat '${path}'`
      );
      error.code = 'ENOENT';
      throw error;
    }
  }

  // Private helper methods
  /**
   * Internal helper to create directories with cross-platform path handling
   * Shared by both mkdirSync and mkdir to ensure consistent behavior
   */
  private createDirectory(dirPath: string, options?: fs.MakeDirectoryOptions): void {
    if (options?.recursive) {
      // Create all parent directories
      const normalizedPath = path.normalize(dirPath);
      const parts = normalizedPath.split(path.sep).filter(p => p);

      const isAbsolute = path.isAbsolute(normalizedPath);
      let currentPath = isAbsolute ? path.parse(normalizedPath).root : '';

      for (const part of parts) {
        currentPath = currentPath ? path.join(currentPath, part) : part;
        this.directories.add(currentPath);
      }
    } else {
      this.directories.add(dirPath);
    }
  }

  // Test helper methods - File/Directory inspection
  reset(): void {
    this.files.clear();
    this.directories.clear();
    this.mkdirCalls = [];
  }

  hasFile(path: string): boolean {
    return this.files.has(path);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  // Test helper methods - Spy functionality
  /**
   * Configure which paths should be treated as existing
   * @param paths Paths that should return true from existsSync
   */
  setExistingPaths(paths: string[]): void {
    for (const path of paths) {
      // Determine if it's a file or directory based on presence of extension
      // This is a heuristic - paths ending in common file extensions are treated as files
      if (path.match(/\.[a-z0-9]+$/i)) {
        this.files.set(path, '');
      } else {
        this.directories.add(path);
      }
    }
  }

  /**
   * Add a single path to the existing paths set
   * @param path Path to mark as existing (treated as directory)
   */
  addExistingPath(path: string): void {
    this.directories.add(path);
  }

  /**
   * Get the history of all mkdir calls (both sync and async)
   * @returns Array of mkdir calls with their parameters and sync/async indicator
   */
  getCreatedPaths(): ReadonlyArray<{
    path: string;
    options?: fs.MakeDirectoryOptions;
    isSync: boolean;
  }> {
    return [...this.mkdirCalls];
  }

  /**
   * Check if mkdir (sync or async) was called with a specific path
   * @param path Path to check
   * @returns true if mkdir/mkdirSync was called with this path
   */
  wasPathCreated(path: string): boolean {
    return this.mkdirCalls.some(call => call.path === path);
  }
}
