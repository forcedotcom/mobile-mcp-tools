import { ProcessServiceProvider } from '../../src/services/interfaces/index.js';
import * as path from 'path';

interface CommandResponse {
  stdout: string;
  stderr?: string;
  exitCode?: number;
  shouldThrow?: boolean;
}

/**
 * Mock implementation of ProcessServiceProvider for testing
 * Allows configuring command responses
 */
export class MockProcessService implements ProcessServiceProvider {
  private commandResponses: Map<string, CommandResponse> = new Map();
  private executedCommands: string[] = [];
  private currentWorkingDirectory = path.resolve(path.sep, 'mock', 'cwd');

  cwd(): string {
    return this.currentWorkingDirectory;
  }

  chdir(path: string): void {
    this.currentWorkingDirectory = path;
  }

  execSync(command: string, options?: { stdio?: 'inherit' | 'pipe' }): Buffer {
    this.executedCommands.push(command);

    const response = this.commandResponses.get(command);
    if (!response) {
      throw new Error(`Mock: No response configured for command: ${command}`);
    }

    if (response.shouldThrow) {
      const error = new Error(response.stdout);
      throw error;
    }

    if (options?.stdio === 'pipe') {
      return Buffer.from(response.stdout);
    }

    // For 'inherit' stdio, we don't return anything but simulate the command running
    return Buffer.from(response.stdout);
  }

  // Helper methods for testing
  setCommandResponse(command: string, stdout: string): void {
    this.commandResponses.set(command, { stdout });
  }

  setCommandToThrow(command: string, errorMessage?: string): void {
    this.commandResponses.set(command, {
      stdout: errorMessage || `Command failed: ${command}`,
      shouldThrow: true,
    });
  }

  getExecutedCommands(): string[] {
    return [...this.executedCommands];
  }

  clearExecutedCommands(): void {
    this.executedCommands = [];
  }

  clearCommandResponses(): void {
    this.commandResponses.clear();
  }

  clear(): void {
    this.clearExecutedCommands();
    this.clearCommandResponses();
    this.currentWorkingDirectory = path.resolve(path.sep, 'mock', 'cwd');
  }

  getCurrentWorkingDirectory(): string {
    return this.currentWorkingDirectory;
  }
}
