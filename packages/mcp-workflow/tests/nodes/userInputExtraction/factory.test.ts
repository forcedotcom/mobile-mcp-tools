/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { createUserInputExtractionNode } from '../../../src/nodes/userInputExtraction/factory.js';
import { InputExtractionServiceProvider } from '../../../src/services/inputExtractionService.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { PropertyMetadataCollection } from '../../../src/common/propertyMetadata.js';

// Test state type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestState = Annotation.Root({
  userInput: Annotation<unknown>(),
  platform: Annotation<string>(),
  projectName: Annotation<string>(),
});

type TestStateType = typeof TestState.State;

describe('createUserInputExtractionNode', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let requiredProperties: PropertyMetadataCollection;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    requiredProperties = {
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

  describe('Factory function', () => {
    it('should create a node with default service when extractionService not provided', () => {
      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
      });

      expect(node).toBeDefined();
      expect(node.name).toBe('userInputExtraction');
    });

    it('should create a node with provided service', () => {
      const mockService: InputExtractionServiceProvider = {
        extractProperties: () => ({
          extractedProperties: {},
        }),
      };

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        extractionService: mockService,
      });

      expect(node).toBeDefined();
      expect(node.name).toBe('userInputExtraction');
    });

    it('should use provided toolExecutor', () => {
      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        toolExecutor: mockToolExecutor,
      });

      expect(node).toBeDefined();
    });

    it('should use provided logger', () => {
      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        logger: mockLogger,
      });

      expect(node).toBeDefined();
    });

    it('should use custom getUserInput function', () => {
      const customGetUserInput = (state: TestStateType) => {
        return state.userInput;
      };

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        getUserInput: customGetUserInput,
      });

      expect(node).toBeDefined();
    });

    it('should create default service with correct toolId', () => {
      const toolId = 'custom-tool-id';
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'iOS',
          projectName: 'TestProject',
        },
      });

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
      });

      const state: TestStateType = {
        userInput: 'I want to create an iOS app called TestProject',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      // Execute node - it should call the service
      const result = node.execute(state);
      expect(result).toBeDefined();
    });
  });

  describe('Node execution with default service', () => {
    it('should extract properties from user input', () => {
      const toolId = 'test-input-extraction';
      const extractedProps = {
        platform: 'iOS',
        projectName: 'MyApp',
      };
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: extractedProps,
      });

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
      });

      const state: TestStateType = {
        userInput: 'I want to create an iOS app called MyApp',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      const result = node.execute(state);

      expect(result.platform).toBe(extractedProps.platform);
      expect(result.projectName).toBe(extractedProps.projectName);
      expect(mockToolExecutor.getCallHistory().length).toBeGreaterThan(0);
    });

    it('should use default getUserInput when not provided', () => {
      const toolId = 'test-input-extraction';
      mockToolExecutor.setResult('Input Extraction', {
        extractedProperties: {
          platform: 'Android',
        },
      });

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
      });

      const state: TestStateType = {
        userInput: 'Android app',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      const result = node.execute(state);
      expect(result).toBeDefined();
    });
  });

  describe('Node execution with custom service', () => {
    it('should use provided service', () => {
      const extractedProps = {
        platform: 'iOS',
        projectName: 'CustomApp',
      };
      const mockService: InputExtractionServiceProvider = {
        extractProperties: () => ({
          extractedProperties: extractedProps,
        }),
      };

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        extractionService: mockService,
      });

      const state: TestStateType = {
        userInput: 'some input',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      const result = node.execute(state);
      expect(result.platform).toBe(extractedProps.platform);
      expect(result.projectName).toBe(extractedProps.projectName);
    });

    it('should pass userInput and properties to service', () => {
      let capturedUserInput: unknown;
      let capturedProperties: unknown;
      const mockService: InputExtractionServiceProvider = {
        extractProperties: (userInput, properties) => {
          capturedUserInput = userInput;
          capturedProperties = properties;
          return {
            extractedProperties: {},
          };
        },
      };

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        extractionService: mockService,
      });

      const state: TestStateType = {
        userInput: 'test input',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      node.execute(state);

      expect(capturedUserInput).toBe('test input');
      expect(capturedProperties).toBe(requiredProperties);
    });
  });
});
