/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Filesystem Operations Abstraction
 *
 * Provides a dependency injection interface for filesystem operations,
 * enabling testability and flexibility across the workflow engine.
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';

/**
 * Interface for filesystem operations - enables dependency injection for testing
 * and alternative filesystem implementations
 *
 * Provides both synchronous and asynchronous methods to support different use cases:
 * - Sync methods: For simple, fast operations where blocking is acceptable
 * - Async methods: For I/O-intensive operations requiring non-blocking behavior
 */
export interface FileSystemOperations {
  // Synchronous operations
  /**
   * Check if a path exists in the filesystem (sync)
   * @param path Path to check
   * @returns true if the path exists, false otherwise
   */
  existsSync(path: string): boolean;

  /**
   * Create a directory (and any necessary parent directories) (sync)
   * @param path Directory path to create
   * @param options Options for directory creation (e.g., recursive, mode)
   */
  mkdirSync(path: string, options?: fs.MakeDirectoryOptions): void;

  /**
   * Create a temporary directory with a given prefix (sync)
   * @param prefix Prefix for the temp directory name
   * @returns Full path to the created directory
   */
  mkdtempSync(prefix: string): string;

  /**
   * Remove a file or directory (sync)
   * @param path Path to remove
   * @param options Options for removal (recursive, force, etc.)
   */
  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;

  /**
   * Get the OS temp directory path (sync)
   * @returns Path to the OS temp directory
   */
  tmpdir(): string;

  // Asynchronous operations
  /**
   * Check if a path exists and is accessible (async)
   * @param path Path to check
   * @throws Error if path doesn't exist or isn't accessible
   */
  access(path: string): Promise<void>;

  /**
   * Read file contents as string (async)
   * @param path File path to read
   * @param encoding Character encoding (e.g., 'utf-8')
   * @returns File contents as string
   */
  readFile(path: string, encoding: BufferEncoding): Promise<string>;

  /**
   * Write string data to file (async)
   * @param path File path to write
   * @param data String data to write
   * @param encoding Character encoding (e.g., 'utf-8')
   */
  writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void>;

  /**
   * Rename/move a file atomically (async)
   * @param oldPath Current file path
   * @param newPath New file path
   */
  rename(oldPath: string, newPath: string): Promise<void>;

  /**
   * Delete a file (async)
   * @param path File path to delete
   */
  unlink(path: string): Promise<void>;

  /**
   * Create a directory (and any necessary parent directories) (async)
   * @param path Directory path to create
   * @param options Options for directory creation (e.g., recursive, mode)
   */
  mkdir(path: string, options?: fs.MakeDirectoryOptions): Promise<void>;

  /**
   * Get file/directory statistics (async)
   * @param path Path to stat
   * @returns File statistics
   */
  stat(path: string): Promise<fs.Stats>;
}

/**
 * Production implementation of FileSystemOperations using Node.js fs module
 * Wraps both sync and async Node.js filesystem operations
 */
/* c8 ignore start */
export class NodeFileSystemOperations implements FileSystemOperations {
  // Synchronous operations
  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  mkdirSync(path: string, options?: fs.MakeDirectoryOptions): void {
    fs.mkdirSync(path, options);
  }

  mkdtempSync(prefix: string): string {
    return fs.mkdtempSync(prefix);
  }

  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    fs.rmSync(path, options);
  }

  tmpdir(): string {
    return os.tmpdir();
  }

  // Asynchronous operations
  async access(path: string): Promise<void> {
    return fsPromises.access(path);
  }

  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    return fsPromises.readFile(path, encoding);
  }

  async writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void> {
    return fsPromises.writeFile(path, data, encoding);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return fsPromises.rename(oldPath, newPath);
  }

  async unlink(path: string): Promise<void> {
    return fsPromises.unlink(path);
  }

  async mkdir(path: string, options?: fs.MakeDirectoryOptions): Promise<void> {
    await fsPromises.mkdir(path, options);
  }

  async stat(path: string): Promise<fs.Stats> {
    return fsPromises.stat(path);
  }
}
/* c8 ignore stop */
