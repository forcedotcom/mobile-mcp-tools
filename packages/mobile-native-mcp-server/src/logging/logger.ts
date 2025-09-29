/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Logging module for the Mobile Native MCP Server
 *
 * Provides a production-ready logging solution using pino with proper dependency injection
 * support for testing and reuse across all MCP tools and facilities.
 */

import pino from 'pino';
import { getWorkflowLogsPath } from '../utils/wellKnownDirectory.js';

/**
 * Logger interface for dependency injection - compatible with pino
 * This interface allows for clean testing and consistent logging across all components
 */
export interface Logger {
  info(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
  warn(message: string, data?: unknown): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Pino-based logger implementation
 * Wraps pino instances to provide our Logger interface while maintaining all pino benefits
 */
export class PinoLogger implements Logger {
  constructor(private pinoInstance: pino.Logger) {}

  info(message: string, data?: unknown): void {
    if (data) {
      this.pinoInstance.info(data, message);
    } else {
      this.pinoInstance.info(message);
    }
  }

  debug(message: string, data?: unknown): void {
    if (data) {
      this.pinoInstance.debug(data, message);
    } else {
      this.pinoInstance.debug(message);
    }
  }

  error(message: string, error?: Error): void {
    if (error) {
      this.pinoInstance.error({ err: error }, message);
    } else {
      this.pinoInstance.error(message);
    }
  }

  warn(message: string, data?: unknown): void {
    if (data) {
      this.pinoInstance.warn(data, message);
    } else {
      this.pinoInstance.warn(message);
    }
  }

  child(bindings: Record<string, unknown>): Logger {
    return new PinoLogger(this.pinoInstance.child(bindings));
  }
}

/**
 * Factory function to create a logger that writes to .magen directory
 *
 * @param level - Log level (default: from LOG_LEVEL env var or 'info')
 * @param options - Additional pino configuration options
 * @returns Logger instance configured for file logging
 */
export function createLogger(
  level: string = process.env.LOG_LEVEL || 'info',
  options: pino.LoggerOptions = {}
): Logger {
  // Defer directory creation until logger is actually needed
  try {
    const logFilePath = getWorkflowLogsPath();

    const pinoInstance = pino(
      {
        level,
        // Use structured JSON output for file logging
        ...options,
      },
      pino.destination({
        dest: logFilePath,
        sync: false, // Async logging for better performance
      })
    );

    return new PinoLogger(pinoInstance);
  } catch (error) {
    // If .magen directory creation fails, fallback to console logging
    console.error('Warning: Could not create file logger, falling back to console logging');
    console.error(error instanceof Error ? error.message : String(error));

    const pinoInstance = pino({
      level,
      ...options,
    });

    return new PinoLogger(pinoInstance);
  }
}

/**
 * Create a logger for a specific MCP tool or component
 *
 * @param componentName - Name of the component (e.g., 'TemplateDiscovery', 'BuildTool')
 * @param level - Log level override
 * @returns Logger instance with component context
 */
export function createComponentLogger(componentName: string, level?: string): Logger {
  const baseLogger = createLogger(level);
  return baseLogger.child({ component: componentName });
}

/**
 * Create a specialized logger for workflow orchestration and MCP tool interactions
 *
 * @param componentName - Name of the workflow component
 * @param level - Log level (default: 'info')
 * @returns Logger instance configured for workflow logging with additional metadata
 */
export function createWorkflowLogger(componentName: string, level?: string): Logger {
  const baseLogger = createLogger(level, {
    // Add workflow-specific metadata to all log entries
    base: {
      service: 'mobile-native-mcp-server',
      logType: 'workflow',
    },
  });

  return baseLogger.child({
    component: componentName,
    workflowSession: true,
  });
}
