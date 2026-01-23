/**
 * Interface for file system operations
 */
export interface FileSystemServiceProvider {
  /**
   * Get the workspace root directory path
   * In production, this is resolved relative to the module location
   * In tests, this can be configured to any path
   */
  readonly workspaceRoot: string;

  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;

  // Method overloads to match Node.js fs.readFileSync behavior:
  // - Returns Buffer when no encoding is specified (binary read)
  // - Returns string when encoding is specified (text read)
  readFileSync(path: string): Buffer;
  readFileSync(path: string, encoding: BufferEncoding): string;
  readFileSync(path: string, encoding?: BufferEncoding): string | Buffer;

  writeFileSync(path: string, data: string | Buffer, encoding?: BufferEncoding): void;
  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  readdirSync(path: string): string[];
}
