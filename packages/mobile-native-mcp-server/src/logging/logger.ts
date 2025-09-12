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
 * Factory function to create a production logger with pino that writes to .magen directory
 *
 * @param level - Log level (default: 'info')
 * @param options - Additional pino configuration options
 * @returns Logger instance configured for production use with file logging
 */
export function createProductionLogger(
  level: string = 'info',
  options: pino.LoggerOptions = {}
): Logger {
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
}

/**
 * Factory function to create a development logger with pretty printing
 *
 * @param level - Log level (default: 'debug')
 * @returns Logger instance configured for development use with pretty printing
 */
export function createDevelopmentLogger(level: string = 'debug'): Logger {
  const pinoInstance = pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  });

  return new PinoLogger(pinoInstance);
}

/**
 * Factory function to create a silent logger for testing
 *
 * @returns Logger instance that produces no output (silent level)
 */
export function createTestLogger(): Logger {
  const pinoInstance = pino({ level: 'silent' });
  return new PinoLogger(pinoInstance);
}

/**
 * Factory function to create a logger based on environment
 *
 * @param environment - Environment string ('production', 'development', 'test')
 * @param level - Log level override
 * @returns Logger instance appropriate for the environment
 */
export function createLogger(
  environment: string = process.env.NODE_ENV || 'development',
  level?: string
): Logger {
  switch (environment) {
    case 'production':
      // Production logs to .magen/workflow_logs.json
      return createProductionLogger(level || 'info');
    case 'test':
      return createTestLogger();
    case 'development':
    default:
      // Development logs to console with pretty printing for debugging
      return createDevelopmentLogger(level || 'debug');
  }
}

/**
 * Create a logger for a specific MCP tool or component
 *
 * @param componentName - Name of the component (e.g., 'TemplateDiscovery', 'BuildTool')
 * @param environment - Environment context
 * @param level - Log level override
 * @returns Logger instance with component context
 */
export function createComponentLogger(
  componentName: string,
  environment?: string,
  level?: string
): Logger {
  const baseLogger = createLogger(environment, level);
  return baseLogger.child({ component: componentName });
}

/**
 * Create a specialized logger for workflow orchestration and MCP tool interactions
 * Always logs to .magen/workflow_logs.json regardless of environment for persistence
 *
 * @param componentName - Name of the workflow component
 * @param level - Log level (default: 'info')
 * @returns Logger instance configured for workflow logging
 */
export function createWorkflowLogger(componentName: string, level: string = 'info'): Logger {
  const logFilePath = getWorkflowLogsPath();

  const pinoInstance = pino(
    {
      level,
      // Add workflow-specific metadata to all log entries
      base: {
        service: 'mobile-native-mcp-server',
        logType: 'workflow',
      },
    },
    pino.destination({
      dest: logFilePath,
      sync: false,
    })
  );

  return new PinoLogger(pinoInstance).child({
    component: componentName,
    workflowSession: true,
  });
}
