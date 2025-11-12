/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import z from 'zod';
import { InputExtractionService } from '../../src/services/inputExtractionService.js';
import { MockToolExecutor } from '../utils/MockToolExecutor.js';
import { MockLogger } from '../utils/MockLogger.js';
import { PropertyMetadataCollection } from '../../src/common/propertyMetadata.js';

describe('InputExtractionService', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let service: InputExtractionService;
  const toolId = 'test-input-extraction';
  let properties: PropertyMetadataCollection;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    service = new InputExtractionService(toolId, mockToolExecutor, mockLogger);
    properties = {
      platform: {
        zodType: z.enum(['iOS', 'Android']),
        description: 'Target platform',
        friendlyName: 'platform',
      },
      projectName: {
        zodType: z.string(),
        description: 'Project name',
        friendlyName: 'project name',
      },
    };
  });

  describe('Constructor', () => {
    it('should initialize with toolId', () => {
      expect(service).toBeDefined();
    });

    it('should create default toolExecutor when not provided', () => {
      const serviceWithoutExecutor = new InputExtractionService(toolId);
      expect(serviceWithoutExecutor).toBeDefined();
    });

    it('should create default logger when not provided', () => {
      const serviceWithoutLogger = new InputExtractionService(toolId, mockToolExecutor);
      expect(serviceWithoutLogger).toBeDefined();
    });
  });

  describe('extractProperties', () => {
    it('should extract properties from user input', () => {
      const extractedProps = {
        platform: 'iOS',
        projectName: 'MyApp',
      };
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: extractedProps,
      });

      const userInput = 'I want to create an iOS app called MyApp';
      const result = service.extractProperties(userInput, properties);

      expect(result.extractedProperties.platform).toBe('iOS');
      expect(result.extractedProperties.projectName).toBe('MyApp');
    });

    it('should log debug message at start', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {},
      });

      mockLogger.reset();
      service.extractProperties('test input', properties);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const logEntry = debugLogs.find(log => log.message.includes('Starting property extraction'));
      expect(logEntry).toBeDefined();
      expect(logEntry?.data).toHaveProperty('userInput');
      expect(logEntry?.data).toHaveProperty('propertyCount');
    });

    it('should log info message on completion', () => {
      const extractedProps = {
        platform: 'Android',
      };
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: extractedProps,
      });

      mockLogger.reset();
      const result = service.extractProperties('Android app', properties);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const logEntry = infoLogs.find(log => log.message.includes('Property extraction completed'));
      expect(logEntry).toBeDefined();
      expect(logEntry?.data).toHaveProperty('extractedCount');
      expect(logEntry?.data).toHaveProperty('properties');
      expect((logEntry?.data as { extractedCount: number }).extractedCount).toBe(
        Object.keys(result.extractedProperties).length
      );
    });

    it('should call tool executor with correct metadata', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
        },
      });

      service.extractProperties('iOS app', properties);

      const callHistory = mockToolExecutor.getCallHistory();
      expect(callHistory.length).toBe(1);
      const call = callHistory[0];
      expect(call.llmMetadata.name).toBe('Input Extraction');
      expect(call.input).toHaveProperty('userUtterance');
      expect(call.input).toHaveProperty('propertiesToExtract');
      expect(call.input).toHaveProperty('resultSchema');
    });

    it('should include userUtterance in tool call', () => {
      const userInput = 'Create an Android app';
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {},
      });

      service.extractProperties(userInput, properties);

      const call = mockToolExecutor.getLastCall();
      expect(call?.input).toHaveProperty('userUtterance');
      expect((call?.input as { userUtterance: unknown }).userUtterance).toBe(userInput);
    });

    it('should prepare properties for extraction', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {},
      });

      service.extractProperties('test', properties);

      const call = mockToolExecutor.getLastCall();
      const input = call?.input as {
        propertiesToExtract: Array<{ propertyName: string; description: string }>;
      };
      expect(input.propertiesToExtract).toBeDefined();
      expect(Array.isArray(input.propertiesToExtract)).toBe(true);
      expect(input.propertiesToExtract.length).toBe(2);
      expect(input.propertiesToExtract[0]).toHaveProperty('propertyName');
      expect(input.propertiesToExtract[0]).toHaveProperty('description');
    });

    it('should include resultSchema in tool call', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {},
      });

      service.extractProperties('test', properties);

      const call = mockToolExecutor.getLastCall();
      const input = call?.input as { resultSchema: string };
      expect(input.resultSchema).toBeDefined();
      expect(typeof input.resultSchema).toBe('string');
      // Should be valid JSON
      expect(() => JSON.parse(input.resultSchema)).not.toThrow();
    });

    it('should handle empty properties collection', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {},
      });

      const result = service.extractProperties('test input', {});

      expect(result.extractedProperties).toEqual({});
    });

    it('should validate and filter null/undefined values', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
          projectName: null,
        },
      });

      const result = service.extractProperties('iOS app', properties);

      expect(result.extractedProperties.platform).toBe('iOS');
      expect(result.extractedProperties.projectName).toBeUndefined();
    });

    it('should skip unknown properties', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
          unknownProperty: 'should be skipped',
        },
      });

      const result = service.extractProperties('iOS app', properties);

      expect(result.extractedProperties.platform).toBe('iOS');
      expect(result.extractedProperties.unknownProperty).toBeUndefined();
    });

    it('should validate property values against zodType', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS', // Valid
          projectName: 'MyApp', // Valid
        },
      });

      const result = service.extractProperties('iOS app MyApp', properties);

      expect(result.extractedProperties.platform).toBe('iOS');
      expect(result.extractedProperties.projectName).toBe('MyApp');
    });

    it('should filter out invalid property values', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'InvalidPlatform', // Invalid - not iOS or Android
          projectName: 'ValidProject', // Valid
        },
      });

      const result = service.extractProperties('test', properties);

      // Invalid platform should be filtered out
      expect(result.extractedProperties.platform).toBeUndefined();
      // Valid projectName should be included
      expect(result.extractedProperties.projectName).toBe('ValidProject');
    });

    it('should log validation failures', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'InvalidPlatform',
        },
      });

      mockLogger.reset();
      service.extractProperties('test', properties);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const validationLog = debugLogs.find(log =>
        log.message.includes('Property validation failed')
      );
      expect(validationLog).toBeDefined();
    });

    it('should log successful validations', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
        },
      });

      mockLogger.reset();
      service.extractProperties('iOS app', properties);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const successLog = debugLogs.find(log =>
        log.message.includes('Property validated successfully')
      );
      expect(successLog).toBeDefined();
    });

    it('should log info when some properties fail validation', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'InvalidPlatform',
          projectName: 'ValidProject',
        },
      });

      mockLogger.reset();
      service.extractProperties('test', properties);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const failureLog = infoLogs.find(log =>
        log.message.includes('Some properties failed validation')
      );
      expect(failureLog).toBeDefined();
      expect(failureLog?.data).toHaveProperty('invalidProperties');
    });

    it('should handle different userInput types', () => {
      const stringInput = 'iOS app';
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
        },
      });

      const result1 = service.extractProperties(stringInput, properties);
      expect(result1.extractedProperties.platform).toBe('iOS');

      // Test with object input
      const objectInput = { message: 'Create iOS app' };
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
        },
      });

      const result2 = service.extractProperties(objectInput, properties);
      expect(result2.extractedProperties.platform).toBe('iOS');
    });

    it('should handle properties with nullable zodType', () => {
      const nullableProperties: PropertyMetadataCollection = {
        optionalField: {
          zodType: z.string().nullable(),
          description: 'Optional field',
          friendlyName: 'optional field',
        },
      };

      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          optionalField: null,
        },
      });

      const result = service.extractProperties('test', nullableProperties);
      // Null values should be filtered out
      expect(result.extractedProperties.optionalField).toBeUndefined();
    });

    it('should handle passthrough schema for extra properties', () => {
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
          extraField: 'should pass through',
        },
      });

      const result = service.extractProperties('iOS app', properties);
      // Extra fields should be filtered out during validation
      expect(result.extractedProperties.platform).toBe('iOS');
      expect(result.extractedProperties.extraField).toBeUndefined();
    });

    it('should throw error for unexpected validation errors', () => {
      // Create a property that will cause a non-ZodError
      const problematicProperties: PropertyMetadataCollection = {
        testField: {
          zodType: z.string().refine(() => {
            throw new Error('Unexpected error');
          }),
          description: 'Test field',
          friendlyName: 'test field',
        },
      };

      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          testField: 'value',
        },
      });

      expect(() => {
        service.extractProperties('test', problematicProperties);
      }).toThrow('Unexpected error');
    });
  });
});
