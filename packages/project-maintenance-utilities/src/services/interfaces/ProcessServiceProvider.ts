/**
 * Interface for process-related operations
 */
export interface ProcessServiceProvider {
  execSync(command: string, options?: { cwd?: string; stdio?: 'inherit' | 'pipe' }): Buffer;
  cwd(): string;
  chdir(directory: string): void;
}
