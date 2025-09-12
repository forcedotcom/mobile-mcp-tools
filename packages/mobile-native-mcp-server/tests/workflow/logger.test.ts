import { describe, it, expect, beforeEach } from 'vitest';
import { 
  Logger,
  PinoLogger, 
  createProductionLogger,
  createDevelopmentLogger,
  createTestLogger,
  createLogger,
  createComponentLogger,
} from '../../src/logging/index.js';
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
    it('should create production logger', () => {
      const logger = createProductionLogger('info');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create development logger', () => {
      const logger = createDevelopmentLogger('debug');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create test logger', () => {
      const logger = createTestLogger();
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create production logger with default level', () => {
      const logger = createProductionLogger();
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create development logger with default level', () => {
      const logger = createDevelopmentLogger();
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create environment-aware logger', () => {
      const prodLogger = createLogger('production');
      const devLogger = createLogger('development');
      const testLogger = createLogger('test');
      
      expect(prodLogger).toBeInstanceOf(PinoLogger);
      expect(devLogger).toBeInstanceOf(PinoLogger);
      expect(testLogger).toBeInstanceOf(PinoLogger);
    });

    it('should create component logger with context', () => {
      const componentLogger = createComponentLogger('TestComponent', 'test');
      expect(componentLogger).toBeDefined();
      expect(componentLogger).toBeInstanceOf(PinoLogger);
    });
  });

  describe('Logger Compatibility', () => {
    it('should work with structured data', () => {
      const logger = createTestLogger();
      
      expect(() => {
        logger.info('test message', { 
          userId: 123, 
          action: 'login',
          metadata: { timestamp: Date.now() }
        });
      }).not.toThrow();
    });

    it('should handle error objects properly', () => {
      const logger = createTestLogger();
      const testError = new Error('Test error message');
      testError.stack = 'Test stack trace';
      
      expect(() => {
        logger.error('An error occurred', testError);
      }).not.toThrow();
    });

    it('should create child loggers with bindings', () => {
      const logger = createTestLogger();
      const childLogger = logger.child({ 
        component: 'WorkflowOrchestrator',
        version: '1.0.0'
      });
      
      expect(childLogger).toBeDefined();
      expect(() => {
        childLogger.info('Child logger message');
      }).not.toThrow();
    });
  });
});
