import { execSync, execFileSync } from 'child_process';
import { ProcessServiceProvider } from '../interfaces/ProcessServiceProvider.js';

/**
 * Concrete implementation of ProcessServiceProvider using Node.js child_process and process modules
 */
export class ProcessService implements ProcessServiceProvider {
  execSync(command: string, options?: { cwd?: string; stdio?: 'inherit' | 'pipe' }): Buffer {
    return execSync(command, { ...options, encoding: null });
  }

  execFileSync(
    file: string,
    args: string[],
    options?: { cwd?: string; stdio?: 'inherit' | 'pipe' }
  ): Buffer {
    return execFileSync(file, args, { ...options, encoding: null });
  }

  cwd(): string {
    return process.cwd();
  }

  chdir(directory: string): void {
    process.chdir(directory);
  }
}
