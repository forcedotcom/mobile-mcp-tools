import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs';
import { FileSystemServiceProvider } from '../interfaces/FileSystemServiceProvider.js';

/**
 * Concrete implementation of FileSystemServiceProvider using Node.js fs module
 */
export class FileSystemService implements FileSystemServiceProvider {
  existsSync(path: string): boolean {
    return existsSync(path);
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, options);
  }

  readFileSync(path: string): Buffer;
  readFileSync(path: string, encoding: BufferEncoding): string;
  readFileSync(path: string, encoding?: BufferEncoding): string | Buffer {
    if (encoding) {
      return readFileSync(path, encoding);
    }
    return readFileSync(path);
  }

  writeFileSync(path: string, data: string | Buffer, encoding?: BufferEncoding): void {
    if (Buffer.isBuffer(data)) {
      writeFileSync(path, data);
    } else {
      writeFileSync(path, data, encoding || 'utf8');
    }
  }

  rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
    rmSync(path, options);
  }

  readdirSync(path: string): string[] {
    return readdirSync(path);
  }
}
