/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Logger, createComponentLogger } from '../logging/logger.js';

/**
 * Simple interface for reporting progress of long-running operations.
 * Used to send periodic notifications to keep tasks alive during execution.
 */
export interface ProgressReporter {
  /**
   * Reports progress of a long-running operation.
   *
   * @param progress - Current progress value (0-100)
   * @param total - Optional total value for calculating percentage
   * @param message - Optional message describing current progress
   */
  report(progress: number, total?: number, message?: string): void;
}

/**
 * MCP progress reporter that sends notifications via MCP protocol.
 * Uses fire-and-forget pattern to avoid blocking execution.
 */
export class MCPProgressReporter implements ProgressReporter {
  private static readonly PROGRESS_TOTAL = 100;
  private readonly logger: Logger;

  constructor(
    private readonly sendNotification: (notification: {
      method: string;
      params?: unknown;
    }) => Promise<void>,
    private readonly progressToken: string
  ) {
    if (!progressToken) {
      throw new Error('Progress token is required for MCPProgressReporter');
    }
    this.logger = createComponentLogger('MCPProgressReporter');
  }

  report(
    progress: number,
    total: number = MCPProgressReporter.PROGRESS_TOTAL,
    message?: string
  ): void {
    const percentage =
      total > 0 ? Math.round((progress / total) * MCPProgressReporter.PROGRESS_TOTAL) : 0;

    // Fire-and-forget notification pattern
    // Use MCP notification format: notifications/progress with progressToken, message, progress, total
    try {
      const notification = {
        method: 'notifications/progress',
        params: {
          progressToken: this.progressToken,
          message: message || `Progress: ${percentage}%`,
          progress: percentage,
          total: MCPProgressReporter.PROGRESS_TOTAL,
        },
      };

      // Send message notification for clients that don't support progress notifications
      this.sendNotification({
        method: 'notifications/message',
        params: {
          message: message ? `Progress: ${percentage}%: ${message}` : `Progress: ${percentage}%`,
        },
      });
      this.sendNotification(notification).catch(error => {
        // Log notification errors but don't block execution
        this.logger.error('Failed to send progress notification', error as Error);
      });
    } catch (error) {
      // Log notification errors but don't block execution
      this.logger.error('Failed to create or send progress notification', error as Error);
    }
  }
}
