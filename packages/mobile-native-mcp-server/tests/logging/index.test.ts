import { describe, it, expect } from 'vitest';
import {
  PinoLogger,
  createProductionLogger,
  createDevelopmentLogger,
  createTestLogger,
  createLogger,
  createComponentLogger,
  createWorkflowLogger,
  createToolLogger,
} from '../../src/logging/index.js';

describe('Logging Module Exports', () => {
  it('should export all logger types and factories', () => {
    // Logger is an interface, so we can't check if it's defined
    // Instead, check that all concrete implementations and factories are available
    expect(PinoLogger).toBeDefined();
    expect(createProductionLogger).toBeDefined();
    expect(createDevelopmentLogger).toBeDefined();
    expect(createTestLogger).toBeDefined();
    expect(createLogger).toBeDefined();
    expect(createComponentLogger).toBeDefined();
    expect(createWorkflowLogger).toBeDefined();
    expect(createToolLogger).toBeDefined();
  });

  it('should provide createToolLogger as alias for createComponentLogger', () => {
    expect(createToolLogger).toBe(createComponentLogger);
  });

  it('should create consistent loggers across different factories', () => {
    const prodLogger = createProductionLogger();
    const devLogger = createDevelopmentLogger();
    const testLogger = createTestLogger();
    const envLogger = createLogger('test');
    const componentLogger = createComponentLogger('TestTool', 'test');
    const workflowLogger = createWorkflowLogger('TestWorkflow');

    // All should be PinoLogger instances
    expect(prodLogger).toBeInstanceOf(PinoLogger);
    expect(devLogger).toBeInstanceOf(PinoLogger);
    expect(testLogger).toBeInstanceOf(PinoLogger);
    expect(envLogger).toBeInstanceOf(PinoLogger);
    expect(componentLogger).toBeInstanceOf(PinoLogger);
    expect(workflowLogger).toBeInstanceOf(PinoLogger);
  });

  it('should support MCP tool usage patterns', () => {
    // Simulate how a tool would create a logger
    const toolLogger = createToolLogger('TemplateDiscovery', 'test');
    
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
