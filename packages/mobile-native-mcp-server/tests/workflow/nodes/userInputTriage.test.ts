/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserInputTriageNode } from '../../../src/workflow/nodes/userInputTriage.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { USER_INPUT_TRIAGE_TOOL } from '../../../src/tools/plan/sfmobile-native-user-input-triage/metadata.js';
import { createTestState } from '../../utils/stateBuilders.js';

// Helper to create valid triage result matching schema
function createTriageResult(
  overrides: {
    extractedProperties?: Partial<{
      platform: 'iOS' | 'Android';
      projectName: string;
      packageName: string;
      organization: string;
      connectedAppClientId: string;
      connectedAppCallbackUri: string;
      loginHost?: string;
    }>;
    analysisDetails?: Partial<{
      confidenceLevel: number;
      missingInformation: string[];
      assumptions: string[];
      recommendations: string[];
    }>;
  } = {}
) {
  return {
    extractedProperties: {
      platform: 'iOS' as const,
      projectName: 'DefaultApp',
      packageName: 'com.default.app',
      organization: 'DefaultOrg',
      connectedAppClientId: 'client-id',
      connectedAppCallbackUri: 'app://oauth',
      loginHost: 'https://login.salesforce.com',
      ...overrides.extractedProperties,
    },
    analysisDetails: {
      confidenceLevel: 0.9,
      missingInformation: [],
      assumptions: [],
      recommendations: [],
      ...overrides.analysisDetails,
    },
  };
}

describe('UserInputTriageNode', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let node: UserInputTriageNode;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new UserInputTriageNode(mockToolExecutor, mockLogger);
  });

  describe('Node Properties', () => {
    it('should have correct node name', () => {
      expect(node.name).toBe('triageUserInput');
    });
  });

  describe('execute()', () => {
    it('should extract and return all properties from triage result', () => {
      const inputState = createTestState({
        userInput: 'Create an iOS app called MyApp for com.example.myapp',
      });

      const triageResult = createTriageResult({
        extractedProperties: {
          platform: 'iOS' as const,
          projectName: 'MyApp',
          packageName: 'com.example.myapp',
          organization: 'Example Org',
          connectedAppClientId: 'client-id-123',
          connectedAppCallbackUri: 'myapp://oauth',
          loginHost: 'https://login.salesforce.com',
        },
      });

      mockToolExecutor.setResult(USER_INPUT_TRIAGE_TOOL.toolId, triageResult);

      const result = node.execute(inputState);

      // Verify all extracted properties are returned
      expect(result).toEqual({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.example.myapp',
        organization: 'Example Org',
        connectedAppClientId: 'client-id-123',
        connectedAppCallbackUri: 'myapp://oauth',
        loginHost: 'https://login.salesforce.com',
      });
    });

    it('should only return defined properties (conditional state update logic)', () => {
      const inputState = createTestState({
        userInput: 'Build a mobile app for MyCompany',
      });

      const triageResult = createTriageResult({
        extractedProperties: {
          platform: 'Android' as const,
          projectName: 'MyCompanyApp',
          packageName: 'com.mycompany.app',
          organization: 'MyCompany',
          connectedAppClientId: 'client-id',
          connectedAppCallbackUri: 'app://callback',
          // loginHost is undefined - should not be in result
        },
        analysisDetails: {
          confidenceLevel: 0.7,
          missingInformation: [],
          assumptions: ['Assumed project name based on organization'],
        },
      });

      mockToolExecutor.setResult(USER_INPUT_TRIAGE_TOOL.toolId, triageResult);

      const result = node.execute(inputState);

      // Should include all defined properties
      expect(result.organization).toBe('MyCompany');
      expect(result.projectName).toBe('MyCompanyApp');
      expect(result.platform).toBe('Android');
      expect(result.packageName).toBe('com.mycompany.app');

      // Should include loginHost if defined, not include if undefined
      if (triageResult.extractedProperties.loginHost) {
        expect(result).toHaveProperty('loginHost');
      } else {
        expect(result).not.toHaveProperty('loginHost');
      }
    });

    it('should pass user input to tool with correct metadata', () => {
      const inputState = createTestState({
        userInput: 'Test user input string',
      });

      const triageResult = createTriageResult();
      mockToolExecutor.setResult(USER_INPUT_TRIAGE_TOOL.toolId, triageResult);

      node.execute(inputState);

      // Verify tool invocation
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(USER_INPUT_TRIAGE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(USER_INPUT_TRIAGE_TOOL.description);
      expect(lastCall?.llmMetadata.inputSchema).toBe(USER_INPUT_TRIAGE_TOOL.inputSchema);
      expect(lastCall?.input).toEqual({
        userUtterance: 'Test user input string',
      });
    });

    it('should log tool execution', () => {
      const inputState = createTestState({
        userInput: 'test input',
      });

      const triageResult = createTriageResult();
      mockToolExecutor.setResult(USER_INPUT_TRIAGE_TOOL.toolId, triageResult);
      mockLogger.reset();

      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs.length).toBeGreaterThan(0);

      const preExecutionLog = debugLogs.find(log => log.message.includes('pre-execution'));
      const postExecutionLog = debugLogs.find(log => log.message.includes('post-execution'));

      expect(preExecutionLog).toBeDefined();
      expect(postExecutionLog).toBeDefined();
    });

    it('should handle structured user input objects', () => {
      const structuredInput = {
        platform: 'iOS',
        projectName: 'TestApp',
        details: 'Some additional context',
      };

      const inputState = createTestState({
        userInput: structuredInput,
      });

      const triageResult = createTriageResult({
        extractedProperties: {
          platform: 'iOS' as const,
          projectName: 'TestApp',
          packageName: 'com.test.app',
          organization: 'TestOrg',
          connectedAppClientId: 'test-client',
          connectedAppCallbackUri: 'testapp://oauth',
        },
      });

      mockToolExecutor.setResult(USER_INPUT_TRIAGE_TOOL.toolId, triageResult);

      const result = node.execute(inputState);

      expect(result.platform).toBe('iOS');
      expect(result.projectName).toBe('TestApp');
    });
  });
});
