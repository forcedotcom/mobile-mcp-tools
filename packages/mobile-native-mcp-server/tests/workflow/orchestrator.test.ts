import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MobileNativeOrchestrator } from '../../src/workflow/orchestrator.js';
import { Logger } from '../../src/logging/index.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// Mock logger implementation for testing - compatible with updated Logger interface
class MockLogger implements Logger {
  // Shared logs array across parent and children to capture all logging
  private static globalLogs: Array<{ level: string; message: string; data?: unknown }> = [];

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

  child(bindings: Record<string, unknown>): Logger {
    // Return a new instance that shares the same global logs array
    return new MockLogger();
  }

  reset(): void {
    MockLogger.globalLogs.length = 0;
  }
}

// Mock MCP Server implementation for testing
class MockMcpServer {
  public readonly registeredTools: Array<{
    toolId: string;
    config: any;
    handler: any;
  }> = [];

  registerTool(toolId: string, config: any, handler: any): void {
    this.registeredTools.push({ toolId, config, handler });
  }

  reset(): void {
    this.registeredTools.length = 0;
  }
}

describe('MobileNativeOrchestrator', () => {
  let mockServer: MockMcpServer;
  let mockLogger: MockLogger;
  let orchestrator: MobileNativeOrchestrator;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new MockMcpServer();
    mockLogger = new MockLogger();
    orchestrator = new MobileNativeOrchestrator(mockServer as any, mockLogger, true);
    annotations = {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    };

    // Clear mocks
    mockServer.reset();
    mockLogger.reset();
  });

  describe('Tool Registration', () => {
    it('should register the orchestrator tool with correct metadata', () => {
      orchestrator.register(annotations);

      expect(mockServer.registeredTools).toHaveLength(1);

      const registeredTool = mockServer.registeredTools[0];
      expect(registeredTool.toolId).toBe('sfmobile-native-project-manager');
      expect(registeredTool.config.description).toBe(
        'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.'
      );
      expect(registeredTool.config.title).toBe(
        'Salesforce Mobile Native Project Manager Orchestrator'
      );
      expect(registeredTool.config.inputSchema).toBeDefined();
      expect(registeredTool.config.outputSchema).toBeDefined();
    });

    it('should merge provided annotations with tool config', () => {
      orchestrator.register(annotations);

      const registeredTool = mockServer.registeredTools[0];
      expect(registeredTool.config.readOnlyHint).toBe(false);
      expect(registeredTool.config.destructiveHint).toBe(false);
      expect(registeredTool.config.idempotentHint).toBe(false);
      expect(registeredTool.config.openWorldHint).toBe(true);
    });

    it('should log registration information', () => {
      // Clear any logs from constructor (child logger creation)
      mockLogger.reset();

      orchestrator.register(annotations);

      // Should have at least one log entry for registration
      expect(mockLogger.logs.length).toBeGreaterThan(0);
      const registrationLog = mockLogger.logs.find(
        log => log.message === 'Registering MCP tool: sfmobile-native-project-manager'
      );
      expect(registrationLog).toBeDefined();
      expect(registrationLog?.level).toBe('info');
    });
  });

  describe('Tool Properties', () => {
    it('should have correct tool metadata properties', () => {
      expect(orchestrator.toolId).toBe('sfmobile-native-project-manager');
      expect(orchestrator.name).toBe('Salesforce Mobile Native Project Manager');
      expect(orchestrator.title).toBe('Salesforce Mobile Native Project Manager Orchestrator');
      expect(orchestrator.description).toBe(
        'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.'
      );
      expect(orchestrator.inputSchema).toBeDefined();
      expect(orchestrator.outputSchema).toBeDefined();
    });
  });
});
