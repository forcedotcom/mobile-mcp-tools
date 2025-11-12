/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  PinoLogger,
  createLogger,
  createComponentLogger,
  createWorkflowLogger,
} from '@salesforce/magen-mcp-workflow';

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
