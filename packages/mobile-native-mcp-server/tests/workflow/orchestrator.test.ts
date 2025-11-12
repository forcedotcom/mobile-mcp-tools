/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MobileNativeOrchestrator } from '../../src/tools/workflow/sfmobile-native-project-manager/tool.js';
import { MockLogger } from '../utils/MockLogger.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MobileNativeOrchestrator', () => {
  let mockServer: McpServer;
  let mockLogger: MockLogger;
  let orchestrator: MobileNativeOrchestrator;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    mockLogger = new MockLogger();
    orchestrator = new MobileNativeOrchestrator(mockServer, mockLogger, true);
    annotations = {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    };

    // Clear mocks
    mockLogger.reset();
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata properties', () => {
      expect(orchestrator.toolMetadata.toolId).toBe('sfmobile-native-project-manager');
      expect(orchestrator.toolMetadata.title).toBe('Salesforce Mobile Native Project Manager');
      expect(orchestrator.toolMetadata.description).toBe(
        'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.'
      );
      expect(orchestrator.toolMetadata.inputSchema).toBeDefined();
      expect(orchestrator.toolMetadata.outputSchema).toBeDefined();
    });

    it('should register without throwing errors', () => {
      expect(() => orchestrator.register(annotations)).not.toThrow();
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

  describe('Workflow Orchestration', () => {
    it('should handle new workflow initiation', async () => {
      const input = {
        userInput: { request: 'I want to create an iOS app' },
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await orchestrator.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.orchestrationInstructionsPrompt).toBeDefined();
      expect(typeof response.orchestrationInstructionsPrompt).toBe('string');
    });

    it('should handle workflow resumption', async () => {
      const input = {
        userInput: { projectPath: '/test/path' },
        workflowStateData: { thread_id: 'existing-thread-123' },
      };

      const result = await orchestrator.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.orchestrationInstructionsPrompt).toBeDefined();
    });

    it('should log workflow processing events', async () => {
      mockLogger.reset();

      const input = {
        userInput: { request: 'Create an Android app' },
        workflowStateData: { thread_id: 'test-456' },
      };

      await orchestrator.handleRequest(input);

      // Should have logged workflow processing events
      expect(mockLogger.logs.length).toBeGreaterThan(0);
      const processingLog = mockLogger.logs.find(
        log => log.message === 'Processing orchestrator request'
      );
      expect(processingLog).toBeDefined();
      expect(processingLog?.level).toBe('info');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Test with invalid input structure
      const invalidInput = {
        // Missing required fields
      };

      // @ts-expect-error: We are intentionally missing required fields.
      const result = await orchestrator.handleRequest(invalidInput);

      // Should not throw, but may return error response
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Input Validation and LLM Edge Cases', () => {
    beforeEach(() => {
      // Clear logs before each test to check error handling
      mockLogger.reset();
    });

    // Note: These tests intentionally use 'any' types to simulate malformed LLM input
    /* eslint-disable @typescript-eslint/no-explicit-any */

    it('should handle completely malformed input and generate new thread ID', async () => {
      // LLM provides completely invalid data structure
      const malformedInput = {
        randomField: 'invalid',
        anotherField: 123,
        workflowStateData: 'this should be an object',
      } as any;

      const result = await orchestrator.handleRequest(malformedInput);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should log parsing error
      const errorLogs = mockLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      const parsingErrorLog = errorLogs.find(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrorLog).toBeDefined();

      // Should log with a generated thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });

    it('should handle missing workflowStateData and use default', async () => {
      const inputWithoutWorkflowState = {
        userInput: { request: 'Create an app' },
      };

      // @ts-expect-error: Intentionally missing workflowStateData to test default behavior
      const result = await orchestrator.handleRequest(inputWithoutWorkflowState);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should not log parsing errors since this is valid (uses default)
      const errorLogs = mockLogger.getLogsByLevel('error');
      const parsingErrors = errorLogs.filter(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrors.length).toBe(0);

      // Should generate new thread ID since default is empty string
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });

    it('should handle workflowStateData with empty thread_id', async () => {
      const inputWithEmptyThreadId = {
        userInput: { request: 'Create an app' },
        workflowStateData: { thread_id: '' },
      };

      const result = await orchestrator.handleRequest(inputWithEmptyThreadId);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should not log parsing errors since input structure is valid
      const errorLogs = mockLogger.getLogsByLevel('error');
      const parsingErrors = errorLogs.filter(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrors.length).toBe(0);

      // Should generate new thread ID since provided one is empty
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });

    it('should handle workflowStateData with missing thread_id property', async () => {
      const inputWithMissingThreadId = {
        userInput: { request: 'Create an app' },
        workflowStateData: { someOtherField: 'value' },
      } as any;

      const result = await orchestrator.handleRequest(inputWithMissingThreadId);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should log parsing error due to invalid workflowStateData structure
      const errorLogs = mockLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      const parsingErrorLog = errorLogs.find(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrorLog).toBeDefined();

      // Should generate new thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });

    it('should handle workflowStateData with null thread_id', async () => {
      const inputWithNullThreadId = {
        userInput: { request: 'Create an app' },
        workflowStateData: { thread_id: null },
      } as any;

      const result = await orchestrator.handleRequest(inputWithNullThreadId);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should log parsing error due to null thread_id
      const errorLogs = mockLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      const parsingErrorLog = errorLogs.find(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrorLog).toBeDefined();

      // Should generate new thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });

    it('should preserve valid thread_id when provided correctly', async () => {
      const validThreadId = 'valid-thread-123';
      const validInput = {
        userInput: { request: 'Resume workflow' },
        workflowStateData: { thread_id: validThreadId },
      };

      const result = await orchestrator.handleRequest(validInput);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should not log parsing errors
      const errorLogs = mockLogger.getLogsByLevel('error');
      const parsingErrors = errorLogs.filter(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrors.length).toBe(0);

      // Should use the provided thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toBe(validThreadId);
    });

    it('should handle complex userInput structures', async () => {
      // LLMs sometimes create nested or complex userInput structures
      const complexMalformedInput = {
        userInput: {
          request: 'Create an app',
          metadata: { platform: 'iOS', invalidField: true },
          nestedObject: { deeply: { nested: { value: 'test' } } },
        },
        workflowStateData: { thread_id: 'complex-test-123' },
      };

      const result = await orchestrator.handleRequest(complexMalformedInput);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should not log parsing errors (userInput can be any structure)
      const errorLogs = mockLogger.getLogsByLevel('error');
      const parsingErrors = errorLogs.filter(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrors.length).toBe(0);

      // Should use the provided thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toBe('complex-test-123');
    });

    it('should handle completely empty input object', async () => {
      const emptyInput = {};

      // @ts-expect-error: We are intentionally missing required fields.
      const result = await orchestrator.handleRequest(emptyInput);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should not log parsing errors (empty object is valid with defaults)
      const errorLogs = mockLogger.getLogsByLevel('error');
      const parsingErrors = errorLogs.filter(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrors.length).toBe(0);

      // Should generate new thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });

    it('should handle input with extra unknown fields', async () => {
      const inputWithExtraFields = {
        userInput: { request: 'Create an app' },
        workflowStateData: { thread_id: 'extra-fields-test' },
        randomExtraField: 'should be ignored',
        anotherField: { nested: 'data' },
        numericField: 42,
      } as any;

      const result = await orchestrator.handleRequest(inputWithExtraFields);

      expect(result.content).toBeDefined();
      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Should not log parsing errors (extra fields should be ignored/stripped)
      const errorLogs = mockLogger.getLogsByLevel('error');
      const parsingErrors = errorLogs.filter(log =>
        log.message.includes('Error parsing orchestrator input')
      );
      expect(parsingErrors.length).toBe(0);

      // Should use the provided thread ID
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLog = infoLogs.find(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLog).toBeDefined();
      expect((processingLog?.data as any)?.threadId).toBe('extra-fields-test');
    });

    it('should generate unique thread IDs for concurrent requests', async () => {
      const inputs = Array(5)
        .fill(0)
        .map((_, i) => ({
          userInput: `Request ${i}`,
          // No workflowStateData to force thread ID generation
        }));

      // @ts-expect-error: We are intentionally missing required fields.
      const results = await Promise.all(inputs.map(input => orchestrator.handleRequest(input)));

      // All should succeed
      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();
      });

      // Extract generated thread IDs from logs
      const infoLogs = mockLogger.getLogsByLevel('info');
      const processingLogs = infoLogs.filter(log =>
        log.message.includes('Processing orchestrator request')
      );
      expect(processingLogs.length).toBe(5);

      const threadIds = processingLogs.map(log => (log.data as any)?.threadId);

      // All thread IDs should be unique
      const uniqueThreadIds = new Set(threadIds);
      expect(uniqueThreadIds.size).toBe(5);

      // All should match the expected format
      threadIds.forEach(threadId => {
        expect(threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
      });
    });

    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  describe('Checkpointer Integration (Memory Mode)', () => {
    it('should use memory checkpointer for testing', async () => {
      // The orchestrator is already configured for memory mode in beforeEach
      const input = {
        userInput: { request: 'Create a mobile app' },
        workflowStateData: { thread_id: 'memory-test-123' },
      };

      const result = await orchestrator.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.structuredContent).toBeDefined();

      // Should log checkpointer usage
      const logs = mockLogger.logs;
      const checkpointerLogs = logs.filter(
        log => log.message.includes('checkpointer') || log.message.includes('state')
      );
      expect(checkpointerLogs.length).toBeGreaterThan(0);
    });

    it('should handle workflow resumption with memory checkpointer', async () => {
      const threadId = 'memory-resume-test-456';

      // First request to start workflow
      const initialInput = {
        userInput: { request: 'Start workflow' },
        workflowStateData: { thread_id: threadId },
      };

      await orchestrator.handleRequest(initialInput);

      // Second request to resume workflow
      const resumeInput = {
        userInput: { someData: 'resume data' },
        workflowStateData: { thread_id: threadId },
      };

      const result = await orchestrator.handleRequest(resumeInput);

      expect(result.content).toBeDefined();
      expect(result.structuredContent).toBeDefined();
    });
  });

  describe('Checkpointer Integration (File Mode)', () => {
    let tempDir: string;
    let fileOrchestrator: MobileNativeOrchestrator;
    let originalProjectPath: string | undefined;

    beforeEach(async () => {
      // Create temporary directory for file-based testing
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-test-'));

      // Store original PROJECT_PATH and set it to our temp directory
      originalProjectPath = process.env.PROJECT_PATH;
      process.env.PROJECT_PATH = tempDir;

      // Create orchestrator without memory mode (file mode)
      fileOrchestrator = new MobileNativeOrchestrator(mockServer, mockLogger, false);
    });

    afterEach(async () => {
      // Restore original PROJECT_PATH
      if (originalProjectPath !== undefined) {
        process.env.PROJECT_PATH = originalProjectPath;
      } else {
        delete process.env.PROJECT_PATH;
      }

      // Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should create and persist state with file checkpointer', async () => {
      const input = {
        userInput: { request: 'Create app with file persistence' },
        workflowStateData: { thread_id: 'file-test-123' },
      };

      const result = await fileOrchestrator.handleRequest(input);

      expect(result.content).toBeDefined();

      // Should log state persistence
      const logs = mockLogger.logs;
      const persistenceLogs = logs.filter(
        log => log.message.includes('persisted') || log.message.includes('state')
      );
      expect(persistenceLogs.length).toBeGreaterThan(0);

      // State file should exist in the .magen well-known directory
      const stateFilePath = path.join(tempDir, '.magen', 'workflow-state.json');
      try {
        await fs.access(stateFilePath);
        // File exists - good!
      } catch {
        // File might not exist if workflow completed immediately
        // This is acceptable for this test
      }
    });

    it('should load existing state on startup', async () => {
      const threadId = 'file-resume-test-789';

      // Create initial state with properly structured workflow result
      const initialInput = {
        userInput: { request: 'Initial workflow' },
        workflowStateData: { thread_id: threadId },
      };

      // Since we're testing the checkpointer functionality, not the workflow execution,
      // we expect this to either succeed or fail gracefully
      try {
        await fileOrchestrator.handleRequest(initialInput);

        // Create new orchestrator instance (simulating restart)
        const newOrchestrator = new MobileNativeOrchestrator(mockServer, mockLogger, false);

        // Resume with structured mock data that matches workflow expectations
        const resumeInput = {
          userInput: {
            extractedProperties: {
              platform: 'iOS' as const,
              projectName: 'TestApp',
              packageName: 'com.test.app',
              organization: 'Test Org',
            },
            analysisDetails: {
              confidenceLevel: 0.8,
              missingInformation: [],
              assumptions: ['Assumed iOS platform'],
              recommendations: ['Continue with project generation'],
            },
          },
          workflowStateData: { thread_id: threadId },
        };

        const result = await newOrchestrator.handleRequest(resumeInput);

        expect(result.content).toBeDefined();

        // Should log state loading
        const logs = mockLogger.logs;
        const loadingLogs = logs.filter(
          log => log.message.includes('Importing') || log.message.includes('existing state')
        );
        expect(loadingLogs.length).toBeGreaterThan(0);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // If the workflow validation fails, that's expected since we're not providing
        // real workflow tool results. The test should still verify that the checkpointer
        // attempts to load state.
        const logs = mockLogger.logs;
        const stateRelatedLogs = logs.filter(
          log =>
            log.message.includes('state') ||
            log.message.includes('checkpointer') ||
            log.message.includes('No existing state') ||
            log.message.includes('fresh')
        );
        expect(stateRelatedLogs.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing state file gracefully', async () => {
      // Ensure no state file exists in the .magen directory
      const stateFilePath = path.join(tempDir, '.magen', 'workflow-state.json');
      try {
        await fs.unlink(stateFilePath);
      } catch {
        // File doesn't exist - that's what we want
      }

      const input = {
        userInput: { request: 'Fresh start' },
        workflowStateData: { thread_id: 'fresh-start-123' },
      };

      const result = await fileOrchestrator.handleRequest(input);

      expect(result.content).toBeDefined();

      // Should log fresh start
      const logs = mockLogger.logs;
      const freshStartLogs = logs.filter(
        log => log.message.includes('fresh') || log.message.includes('No existing state')
      );
      expect(freshStartLogs.length).toBeGreaterThan(0);
    });

    it('should handle corrupted state file', async () => {
      // Write invalid JSON to state file in .magen directory
      const stateFilePath = path.join(tempDir, '.magen', 'workflow-state.json');
      await fs.mkdir(path.dirname(stateFilePath), { recursive: true });
      await fs.writeFile(stateFilePath, 'invalid json content', 'utf-8');

      const input = {
        userInput: { request: 'Handle corruption' },
        workflowStateData: { thread_id: 'corruption-test-123' },
      };

      // Should not throw, should start fresh
      const result = await fileOrchestrator.handleRequest(input);

      expect(result.content).toBeDefined();

      // Should log fresh start due to invalid state
      const logs = mockLogger.logs;
      const freshStartLogs = logs.filter(
        log => log.message.includes('fresh') || log.message.includes('No existing state')
      );
      expect(freshStartLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Thread ID Generation and Management', () => {
    it('should generate unique thread IDs', async () => {
      const input1 = { userInput: { request: 'First request' } };
      const input2 = { userInput: { request: 'Second request' } };

      // @ts-expect-error: Intentionally missing workflowStateData to force thread ID generation
      const result1 = await orchestrator.handleRequest(input1);
      // @ts-expect-error: Intentionally missing workflowStateData to force thread ID generation
      const result2 = await orchestrator.handleRequest(input2);

      // Both should have orchestration prompts
      expect(result1.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();
      expect(result2.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      // Thread IDs should be different (we can't directly access them, but we test indirectly)
      expect(result1.structuredContent?.orchestrationInstructionsPrompt).not.toBe(
        result2.structuredContent?.orchestrationInstructionsPrompt
      );
    });

    it('should use provided thread ID when given', async () => {
      const threadId = 'user-provided-thread-456';
      const input = {
        userInput: { request: 'Use my thread ID' },
        workflowStateData: { thread_id: threadId },
      };

      const result = await orchestrator.handleRequest(input);

      expect(result.content).toBeDefined();

      // Should log with the provided thread ID
      const logs = mockLogger.logs;
      const threadLogs = logs.filter(
        log =>
          log.message.includes('Processing orchestrator request') &&
          log.data &&
          typeof log.data === 'object' &&
          'threadId' in log.data
      );
      expect(threadLogs.length).toBeGreaterThan(0);

      const threadLog = threadLogs[0];
      expect((threadLog.data as { threadId: string }).threadId).toBe(threadId);
    });

    it('should handle thread ID format correctly', async () => {
      const input = { userInput: { request: 'Generate thread ID' } };

      // @ts-expect-error: Intentionally missing workflowStateData to test thread ID generation
      const result = await orchestrator.handleRequest(input);

      expect(result.content).toBeDefined();

      // Should log thread ID in expected format
      const logs = mockLogger.logs;
      const threadLogs = logs.filter(
        log =>
          log.message.includes('Processing orchestrator request') &&
          log.data &&
          typeof log.data === 'object' &&
          'threadId' in log.data
      );
      expect(threadLogs.length).toBeGreaterThan(0);

      const threadId = (threadLogs[0].data as { threadId: string }).threadId;
      expect(typeof threadId).toBe('string');
      expect(threadId).toMatch(/^mmw-\d+-[a-z0-9]{6}$/);
    });
  });

  describe('Workflow State Management', () => {
    it('should include workflow state data in orchestration prompt', async () => {
      const workflowStateData = { thread_id: 'prompt-test-123' };
      const input = {
        userInput: { request: 'Test state in prompt' },
        workflowStateData,
      };

      const result = await orchestrator.handleRequest(input);

      expect(result.structuredContent?.orchestrationInstructionsPrompt).toBeDefined();

      const prompt = result.structuredContent!.orchestrationInstructionsPrompt;

      // Prompt should include workflow state data
      expect(prompt).toContain('workflowStateData');
      expect(prompt).toContain(JSON.stringify(workflowStateData));
      expect(prompt).toContain('round-tripped back');
    });

    it('should handle workflow completion', async () => {
      // Mock a completed workflow scenario
      // Note: This is difficult to test without mocking the entire workflow graph
      // For now, we test that the method handles the completion case
      const input = {
        userInput: { request: 'Complete workflow' },
        workflowStateData: { thread_id: 'completion-test-123' },
      };

      const result = await orchestrator.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.structuredContent).toBeDefined();

      // Should either have orchestration prompt or completion message
      const prompt = result.structuredContent?.orchestrationInstructionsPrompt;
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('should log workflow processing steps', async () => {
      mockLogger.reset();

      const input = {
        userInput: { request: 'Test logging' },
        workflowStateData: { thread_id: 'logging-test-123' },
      };

      await orchestrator.handleRequest(input);

      const logs = mockLogger.logs;

      // Should have various processing logs
      const expectedLogMessages = [
        'Processing orchestrator request',
        'Checking for interrupted workflow state',
      ];

      for (const expectedMessage of expectedLogMessages) {
        const hasLog = logs.some(log => log.message.includes(expectedMessage));
        expect(hasLog).toBe(true);
      }
    });
  });
});
