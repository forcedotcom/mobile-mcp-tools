import { ActionsServiceProvider } from '../../src/services/interfaces/index.js';

interface LogEntry {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

interface OutputEntry {
  name: string;
  value: string;
  timestamp: Date;
}

interface VariableEntry {
  name: string;
  value: string;
  timestamp: Date;
}

/**
 * Mock implementation of ActionsServiceProvider for testing
 * Tracks all actions calls for verification
 */
export class MockActionsService implements ActionsServiceProvider {
  private logs: LogEntry[] = [];
  private outputs: OutputEntry[] = [];
  private variables: VariableEntry[] = [];
  private failureMessage: string | null = null;

  info(message: string): void {
    this.logs.push({
      level: 'info',
      message,
      timestamp: new Date(),
    });
  }

  warning(message: string): void {
    this.logs.push({
      level: 'warning',
      message,
      timestamp: new Date(),
    });
  }

  error(message: string): void {
    this.logs.push({
      level: 'error',
      message,
      timestamp: new Date(),
    });
  }

  setOutput(name: string, value: string): void {
    this.outputs.push({
      name,
      value,
      timestamp: new Date(),
    });
  }

  exportVariable(name: string, value: string): void {
    this.variables.push({
      name,
      value,
      timestamp: new Date(),
    });
  }

  setFailed(message: string): void {
    this.failureMessage = message;
  }

  // Helper methods for testing
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: 'info' | 'warning' | 'error'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogMessages(): string[] {
    return this.logs.map(log => log.message);
  }

  getInfoMessages(): string[] {
    return this.getLogsByLevel('info').map(log => log.message);
  }

  getWarningMessages(): string[] {
    return this.getLogsByLevel('warning').map(log => log.message);
  }

  getErrorMessages(): string[] {
    return this.getLogsByLevel('error').map(log => log.message);
  }

  getOutputs(): OutputEntry[] {
    return [...this.outputs];
  }

  getOutput(name: string): string | undefined {
    // Find the most recent output with the given name (to handle overwrites)
    const outputs = this.outputs.filter(output => output.name === name);
    if (outputs.length === 0) return undefined;
    return outputs[outputs.length - 1].value;
  }

  getVariables(): VariableEntry[] {
    return [...this.variables];
  }

  getVariable(name: string): string | undefined {
    const variable = this.variables.find(variable => variable.name === name);
    return variable?.value;
  }

  getFailureMessage(): string | null {
    return this.failureMessage;
  }

  hasFailed(): boolean {
    return this.failureMessage !== null;
  }

  clear(): void {
    this.logs = [];
    this.outputs = [];
    this.variables = [];
    this.failureMessage = null;
  }

  // Utility methods for test assertions
  assertInfoLogged(message: string): void {
    const infoMessages = this.getInfoMessages();
    if (!infoMessages.includes(message)) {
      throw new Error(
        `Expected info message "${message}" not found. Actual messages: ${infoMessages.join(', ')}`
      );
    }
  }

  assertWarningLogged(message: string): void {
    const warningMessages = this.getWarningMessages();
    if (!warningMessages.includes(message)) {
      throw new Error(
        `Expected warning message "${message}" not found. Actual messages: ${warningMessages.join(', ')}`
      );
    }
  }

  assertErrorLogged(message: string): void {
    const errorMessages = this.getErrorMessages();
    if (!errorMessages.includes(message)) {
      throw new Error(
        `Expected error message "${message}" not found. Actual messages: ${errorMessages.join(', ')}`
      );
    }
  }

  assertOutputSet(name: string, value: string): void {
    const output = this.getOutput(name);
    if (output !== value) {
      throw new Error(`Expected output "${name}" to be "${value}", but got "${output}"`);
    }
  }

  assertVariableSet(name: string, value: string): void {
    const variable = this.getVariable(name);
    if (variable !== value) {
      throw new Error(`Expected variable "${name}" to be "${value}", but got "${variable}"`);
    }
  }

  assertFailed(message?: string): void {
    if (!this.hasFailed()) {
      throw new Error('Expected action to fail, but it did not');
    }
    if (message && this.failureMessage !== message) {
      throw new Error(`Expected failure message "${message}", but got "${this.failureMessage}"`);
    }
  }

  assertNotFailed(): void {
    if (this.hasFailed()) {
      throw new Error(`Expected action not to fail, but it failed with: ${this.failureMessage}`);
    }
  }
}
