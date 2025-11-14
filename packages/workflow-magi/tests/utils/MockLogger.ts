/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Logger } from '@salesforce/magen-mcp-workflow';

/**
 * Mock logger for testing that captures all log entries
 * Provides shared logging across parent and child loggers for comprehensive test verification
 */
export class MockLogger implements Logger {
  // Shared logs array across all instances to capture all logging activity
  private static globalLogs: Array<{ level: string; message: string; data?: unknown }> = [];

  /**
   * Get all captured log entries
   */
  public get logs(): Array<{ level: string; message: string; data?: unknown }> {
    return MockLogger.globalLogs;
  }

  info(message: string, data?: unknown): void {
    MockLogger.globalLogs.push({ level: 'info', message, data });
  }

  debug(message: string, data?: unknown): void {
    MockLogger.globalLogs.push({ level: 'debug', message, data });
  }

  error(message: string, error?: Error): void {
    MockLogger.globalLogs.push({ level: 'error', message, data: error });
  }

  warn(message: string, data?: unknown): void {
    MockLogger.globalLogs.push({ level: 'warn', message, data });
  }

  child(_bindings: Record<string, unknown>): Logger {
    // Return a new instance that shares the same global logs array
    return new MockLogger();
  }

  /**
   * Clear all captured logs (for test cleanup)
   */
  reset(): void {
    MockLogger.globalLogs.length = 0;
  }

  /**
   * Get logs by level for targeted assertions
   */
  getLogsByLevel(level: string): Array<{ level: string; message: string; data?: unknown }> {
    return MockLogger.globalLogs.filter(log => log.level === level);
  }

  /**
   * Check if a specific message was logged
   */
  hasLoggedMessage(message: string, level?: string): boolean {
    return MockLogger.globalLogs.some(
      log => log.message.includes(message) && (level ? log.level === level : true)
    );
  }

  /**
   * Get the last logged entry
   */
  getLastLog(): { level: string; message: string; data?: unknown } | undefined {
    return MockLogger.globalLogs[MockLogger.globalLogs.length - 1];
  }
}
