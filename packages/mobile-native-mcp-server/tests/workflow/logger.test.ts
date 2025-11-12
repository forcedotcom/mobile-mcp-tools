/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Logger,
  PinoLogger,
  createLogger,
  createComponentLogger,
} from '@salesforce/magen-mcp-workflow';
import pino from 'pino';

describe('Logger Implementation', () => {
  describe('PinoLogger', () => {
    let logger: Logger;

    beforeEach(() => {
      // Create a silent pino instance for testing
      const pinoInstance = pino({ level: 'silent' });
      logger = new PinoLogger(pinoInstance);
    });

    it('should implement Logger interface', () => {
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.child).toBeDefined();
    });

    it('should create child loggers', () => {
      const childLogger = logger.child({ component: 'test' });
      expect(childLogger).toBeDefined();
      expect(childLogger).toBeInstanceOf(PinoLogger);
    });

    it('should handle logging calls without errors', () => {
      expect(() => logger.info('test message')).not.toThrow();
      expect(() => logger.debug('debug message', { data: 'test' })).not.toThrow();
      expect(() => logger.error('error message', new Error('test error'))).not.toThrow();
      expect(() => logger.warn('warning message')).not.toThrow();
    });
  });

  describe('Logger Factories', () => {
    it('should create logger with default level', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create logger with specified level', () => {
      const logger = createLogger('debug');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create logger with info level', () => {
      const logger = createLogger('info');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create logger with warn level', () => {
      const logger = createLogger('warn');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create component logger with default level', () => {
      const logger = createComponentLogger('TestComponent');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create logger with error level', () => {
      const logger = createLogger('error');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create component logger with context', () => {
      const componentLogger = createComponentLogger('TestComponent', 'debug');
      expect(componentLogger).toBeDefined();
      expect(componentLogger).toBeInstanceOf(PinoLogger);
    });
  });

  describe('Logger Compatibility', () => {
    it('should work with structured data', () => {
      const logger = createLogger('silent');

      expect(() => {
        logger.info('test message', {
          userId: 123,
          action: 'login',
          metadata: { timestamp: Date.now() },
        });
      }).not.toThrow();
    });

    it('should handle error objects properly', () => {
      const logger = createLogger('silent');
      const testError = new Error('Test error message');
      testError.stack = 'Test stack trace';

      expect(() => {
        logger.error('An error occurred', testError);
      }).not.toThrow();
    });

    it('should create child loggers with bindings', () => {
      const logger = createLogger('silent');
      const childLogger = logger.child({
        component: 'WorkflowOrchestrator',
        version: '1.0.0',
      });

      expect(childLogger).toBeDefined();
      expect(() => {
        childLogger.info('Child logger message');
      }).not.toThrow();
    });
  });
});
