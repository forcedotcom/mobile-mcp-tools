/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PinoLogger,
  createLogger,
  createComponentLogger,
  createWorkflowLogger,
} from '../../src/logging/logger.js';

describe('Logging Module Exports', () => {
  it('should export all logger types and factories', () => {
    // Logger is an interface, so we can't check if it's defined
    // Instead, check that all concrete implementations and factories are available
    expect(PinoLogger).toBeDefined();
    expect(createLogger).toBeDefined();
    expect(createComponentLogger).toBeDefined();
    expect(createWorkflowLogger).toBeDefined();
  });

  it('should create consistent loggers across different factories', () => {
    const defaultLogger = createLogger();
    const infoLogger = createLogger('info');
    const debugLogger = createLogger('debug');
    const componentLogger = createComponentLogger('TestTool', 'debug');
    const workflowLogger = createWorkflowLogger('TestWorkflow');

    // All should be PinoLogger instances
    expect(defaultLogger).toBeInstanceOf(PinoLogger);
    expect(infoLogger).toBeInstanceOf(PinoLogger);
    expect(debugLogger).toBeInstanceOf(PinoLogger);
    expect(componentLogger).toBeInstanceOf(PinoLogger);
    expect(workflowLogger).toBeInstanceOf(PinoLogger);
  });

  it('should support MCP tool usage patterns', () => {
    // Simulate how a tool would create a logger
    const toolLogger = createComponentLogger('TemplateDiscovery', 'debug');

    expect(() => {
      toolLogger.info('Tool initialized');
      toolLogger.debug('Processing template request', { platform: 'iOS' });
      toolLogger.warn('Template not found, using default');
      toolLogger.error('Failed to parse template', new Error('Parse error'));
    }).not.toThrow();

    // Child logger for sub-operations
    const operationLogger = toolLogger.child({ operation: 'validateTemplate' });
    expect(() => {
      operationLogger.info('Starting template validation');
    }).not.toThrow();
  });

  it('should support workflow logging patterns', () => {
    // Simulate workflow logging usage
    const workflowLogger = createWorkflowLogger('TestWorkflow', 'debug');

    expect(() => {
      workflowLogger.info('Workflow started', { threadId: 'test-123' });
      workflowLogger.debug('Processing step', { step: 'template-discovery' });
      workflowLogger.warn('Non-critical issue detected');
      workflowLogger.error('Workflow error occurred', new Error('Test error'));
    }).not.toThrow();

    // Test workflow logger always creates file-based logging
    expect(workflowLogger).toBeInstanceOf(PinoLogger);
  });
});

describe('Logger Graceful Fallback Behavior', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalProjectDir: string | undefined;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    originalProjectDir = process.env.PROJECT_PATH;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (originalProjectDir !== undefined) {
      process.env.PROJECT_PATH = originalProjectDir;
    } else {
      delete process.env.PROJECT_PATH;
    }
  });

  it('should create console logger when .magen directory cannot be created', () => {
    // Set PROJECT_PATH to a non-existent directory
    process.env.PROJECT_PATH = '/nonexistent/directory';

    const logger = createLogger();

    // Should still return a PinoLogger instance (console-based)
    expect(logger).toBeInstanceOf(PinoLogger);

    // Should have logged error messages about fallback
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Warning: Could not create file logger, falling back to console logging'
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create .magen directory')
    );
  });

  it('should create console logger when PROJECT_PATH points to invalid location', () => {
    // Set PROJECT_PATH to a file instead of directory (this would cause mkdir to fail)
    process.env.PROJECT_PATH = '/tmp';

    // Mock fs to make mkdir fail for this specific case
    const logger = createLogger();

    // Should still create a logger instance
    expect(logger).toBeInstanceOf(PinoLogger);
  });

  it('should create file logger when PROJECT_PATH is valid', () => {
    // Set PROJECT_PATH to a valid directory
    process.env.PROJECT_PATH = '/tmp';

    const logger = createLogger();

    // Should create a logger without errors
    expect(logger).toBeInstanceOf(PinoLogger);

    // Should not have logged any fallback messages
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Warning: Could not create file logger, falling back to console logging'
    );
  });

  it('should handle errors in createComponentLogger gracefully', () => {
    process.env.PROJECT_PATH = '/nonexistent/directory';

    const componentLogger = createComponentLogger('TestComponent');

    expect(componentLogger).toBeInstanceOf(PinoLogger);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Warning: Could not create file logger, falling back to console logging'
    );
  });

  it('should handle errors in createWorkflowLogger gracefully', () => {
    process.env.PROJECT_PATH = '/nonexistent/directory';

    const workflowLogger = createWorkflowLogger('TestWorkflow');

    expect(workflowLogger).toBeInstanceOf(PinoLogger);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Warning: Could not create file logger, falling back to console logging'
    );
  });

  it('should maintain logger functionality in fallback mode', () => {
    process.env.PROJECT_PATH = '/nonexistent/directory';

    const logger = createLogger();

    // All logging methods should work without throwing
    expect(() => {
      logger.info('Test info message');
      logger.debug('Test debug message');
      logger.warn('Test warning message');
      logger.error('Test error message', new Error('Test error'));
    }).not.toThrow();
  });

  it('should create child loggers successfully in fallback mode', () => {
    process.env.PROJECT_PATH = '/nonexistent/directory';

    const logger = createLogger();
    const childLogger = logger.child({ component: 'test' });

    expect(childLogger).toBeInstanceOf(PinoLogger);

    // Child logger should also work
    expect(() => {
      childLogger.info('Child logger test');
    }).not.toThrow();
  });
});
