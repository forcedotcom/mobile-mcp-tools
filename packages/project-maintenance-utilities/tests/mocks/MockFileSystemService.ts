import { FileSystemServiceProvider } from '../../src/services/interfaces/index.js';
import { sep, join } from 'path';

interface ErrorConfig {
  error: Error;
  path?: string; // If undefined, applies to all paths
  operation?: 'existsSync' | 'mkdirSync' | 'readFileSync' | 'writeFileSync' | 'rmSync';
}

/**
 * Mock implementation of FileSystemServiceProvider for testing
 * Stores file system state in memory with cross-platform path handling
 * Supports configurable error simulation for comprehensive testing
 */
export class MockFileSystemService implements FileSystemServiceProvider {
  private files: Map<string, string | Buffer> = new Map();
  private directories: Set<string> = new Set();
  private errorConfigs: ErrorConfig[] = [];

  /**
   * Check if an error should be thrown for the given operation and path
   */
  private checkForError(operation: ErrorConfig['operation'], path: string): void {
    let matchedConfig: ErrorConfig | null = null;
    let priority = -1;

    for (const config of this.errorConfigs) {
      // Check if this error config applies to this operation and path
      const operationMatches = !config.operation || config.operation === operation;
      const pathMatches = !config.path || path.startsWith(config.path) || config.path === path;

      if (operationMatches && pathMatches) {
        // Calculate priority: operation+path (3) > operation (2) > path (1) > global (0)
        let configPriority = 0;
        if (config.operation && config.path) configPriority = 3;
        else if (config.operation) configPriority = 2;
        else if (config.path) configPriority = 1;

        // Use this config if it has higher priority, or if same priority but more specific path
        if (
          configPriority > priority ||
          (configPriority === priority &&
            config.path &&
            (!matchedConfig?.path || config.path.length > matchedConfig.path.length))
        ) {
          matchedConfig = config;
          priority = configPriority;
        }
      }
    }

    if (matchedConfig) {
      throw matchedConfig.error;
    }
  }

  existsSync(path: string): boolean {
    this.checkForError('existsSync', path);
    return this.files.has(path) || this.directories.has(path);
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    this.checkForError('mkdirSync', path);
    if (options?.recursive) {
      // Create parent directories using platform-appropriate separator
      const parts = path.split(sep);
      let currentPath = '';
      for (const part of parts) {
        currentPath = currentPath ? join(currentPath, part) : part;
        if (currentPath) {
          this.directories.add(currentPath);
        }
      }
    } else {
      this.directories.add(path);
    }
  }

  readFileSync(path: string): Buffer;
  readFileSync(path: string, encoding: BufferEncoding): string;
  readFileSync(path: string, encoding?: BufferEncoding): string | Buffer {
    this.checkForError('readFileSync', path);
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }

    if (encoding) {
      // Return string when encoding is specified
      if (Buffer.isBuffer(content)) {
        return content.toString(encoding);
      }
      return content;
    } else {
      // Return Buffer when no encoding is specified
      if (Buffer.isBuffer(content)) {
        return content;
      }
      return Buffer.from(content, 'utf8');
    }
  }

  writeFileSync(path: string, data: string | Buffer, encoding?: BufferEncoding): void {
    this.checkForError('writeFileSync', path);
    // encoding parameter is part of the interface but not used in mock implementation
    void encoding;
    if (Buffer.isBuffer(data)) {
      this.files.set(path, data);
    } else {
      this.files.set(path, data);
    }
  }

  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    this.checkForError('rmSync', path);
    if (options?.recursive) {
      // Remove all files and directories that start with the path
      const toRemove = Array.from(this.files.keys()).filter(key => key.startsWith(path));
      toRemove.forEach(key => this.files.delete(key));

      const dirsToRemove = Array.from(this.directories).filter(dir => dir.startsWith(path));
      dirsToRemove.forEach(dir => this.directories.delete(dir));
    } else {
      this.files.delete(path);
      this.directories.delete(path);
    }
  }

  // Helper methods for testing
  setFileContent(path: string, content: string | Buffer): void {
    this.files.set(path, content);
  }

  getFileContent(path: string): string | Buffer | undefined {
    return this.files.get(path);
  }

  setDirectoryExists(path: string): void {
    this.directories.add(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.errorConfigs = [];
  }

  getFiles(): Map<string, string | Buffer> {
    return new Map(this.files);
  }

  getDirectories(): Set<string> {
    return new Set(this.directories);
  }

  // Error simulation methods

  /**
   * Configure an error to be thrown for all operations on all paths
   */
  setGlobalError(error: Error): void {
    this.errorConfigs.push({ error });
  }

  /**
   * Configure an error to be thrown for all operations on a specific path
   */
  setPathError(path: string, error: Error): void {
    this.errorConfigs.push({ error, path });
  }

  /**
   * Configure an error to be thrown for a specific operation on all paths
   */
  setOperationError(operation: ErrorConfig['operation'], error: Error): void {
    this.errorConfigs.push({ error, operation });
  }

  /**
   * Configure an error to be thrown for a specific operation on a specific path
   */
  setOperationPathError(operation: ErrorConfig['operation'], path: string, error: Error): void {
    this.errorConfigs.push({ error, operation, path });
  }

  /**
   * Clear all error configurations
   */
  clearErrors(): void {
    this.errorConfigs = [];
  }

  /**
   * Get current error configurations (for debugging)
   */
  getErrorConfigs(): ErrorConfig[] {
    return [...this.errorConfigs];
  }
}
