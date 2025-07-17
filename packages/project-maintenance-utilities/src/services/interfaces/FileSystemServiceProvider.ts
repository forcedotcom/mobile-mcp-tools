/**
 * Interface for file system operations
 */
export interface FileSystemServiceProvider {
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
}
