/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GetInputService } from '../../src/services/getInputService.js';
import { MockToolExecutor } from '../utils/MockToolExecutor.js';
import { MockLogger } from '../utils/MockLogger.js';

describe('GetInputService', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let service: GetInputService;
  const toolId = 'test-get-input';

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    service = new GetInputService(toolId, mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with toolId', () => {
      expect(service).toBeDefined();
    });

    it('should create default toolExecutor when not provided', () => {
      const serviceWithoutExecutor = new GetInputService(toolId);
      expect(serviceWithoutExecutor).toBeDefined();
    });

    it('should create default logger when not provided', () => {
      const serviceWithoutLogger = new GetInputService(toolId, mockToolExecutor);
      expect(serviceWithoutLogger).toBeDefined();
    });
  });

  describe('getInput', () => {
    it('should return userUtterance from tool result', () => {
      const userResponse = 'iOS';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: userResponse,
      });

      const unfulfilledProperties = [
        {
          propertyName: 'platform',
          friendlyName: 'platform',
          description: 'Target platform',
        },
      ];

      const result = service.getInput(unfulfilledProperties);

      expect(result).toBe(userResponse);
    });

    it('should call tool executor with correct metadata', () => {
      const userResponse = 'MyProject';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: userResponse,
      });

      const unfulfilledProperties = [
        {
          propertyName: 'projectName',
          friendlyName: 'project name',
          description: 'Project name',
        },
      ];

      service.getInput(unfulfilledProperties);

      const callHistory = mockToolExecutor.getCallHistory();
      expect(callHistory.length).toBe(1);
      const call = callHistory[0];
      expect(call.llmMetadata.name).toBe('Get User Input');
      expect(call.input).toHaveProperty('propertiesRequiringInput');
      expect(
        (call.input as { propertiesRequiringInput: unknown[] }).propertiesRequiringInput
      ).toEqual(unfulfilledProperties);
    });

    it('should log debug message with properties', () => {
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: 'test',
      });

      const unfulfilledProperties = [
        {
          propertyName: 'platform',
          friendlyName: 'platform',
          description: 'Target platform',
        },
      ];

      mockLogger.reset();
      service.getInput(unfulfilledProperties);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const logEntry = debugLogs.find(log => log.message.includes('Starting input request'));
      expect(logEntry).toBeDefined();
      expect(logEntry?.data).toHaveProperty('unfulfilledProperties');
    });

    it('should handle empty properties array', () => {
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: 'no properties needed',
      });

      const result = service.getInput([]);

      expect(result).toBe('no properties needed');
    });

    it('should handle multiple properties', () => {
      const userResponse = 'iOS and MyProject';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: userResponse,
      });

      const unfulfilledProperties = [
        {
          propertyName: 'platform',
          friendlyName: 'platform',
          description: 'Target platform',
        },
        {
          propertyName: 'projectName',
          friendlyName: 'project name',
          description: 'Project name',
        },
      ];

      const result = service.getInput(unfulfilledProperties);

      expect(result).toBe(userResponse);
      const callHistory = mockToolExecutor.getCallHistory();
      expect(callHistory.length).toBe(1);
      const call = callHistory[0];
      const input = call.input as { propertiesRequiringInput: unknown[] };
      expect(input.propertiesRequiringInput.length).toBe(2);
    });

    it('should validate result schema', () => {
      // Invalid result - wrong structure (not an object with userUtterance)
      // The schema expects { userUtterance: unknown }, so a string directly should fail
      mockToolExecutor.setResult('Get User Input', 'invalid result');

      const unfulfilledProperties = [
        {
          propertyName: 'platform',
          friendlyName: 'platform',
          description: 'Target platform',
        },
      ];

      expect(() => {
        service.getInput(unfulfilledProperties);
      }).toThrow();
    });

    it('should handle different userUtterance types', () => {
      const stringResponse = 'iOS';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: stringResponse,
      });

      const result1 = service.getInput([
        {
          propertyName: 'platform',
          friendlyName: 'platform',
          description: 'Target platform',
        },
      ]);

      expect(result1).toBe(stringResponse);

      // Test with object response
      const objectResponse = { platform: 'iOS', projectName: 'MyApp' };
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: objectResponse,
      });

      const result2 = service.getInput([
        {
          propertyName: 'platform',
          friendlyName: 'platform',
          description: 'Target platform',
        },
      ]);

      expect(result2).toEqual(objectResponse);
    });
  });
});
