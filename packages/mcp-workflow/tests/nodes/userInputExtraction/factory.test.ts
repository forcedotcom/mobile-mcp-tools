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

// Test state definition
// NB: Since we only use TestState to create and use its State type, TypeScript complains.
// Hence the underscore prefix here.
const _TestState = Annotation.Root({
  userInput: Annotation<unknown>,
  platform: Annotation<string>,
  projectName: Annotation<string>,
});

type TestStateType = typeof _TestState.State;

/**
 * Creates a test State object with sensible defaults for testing.
 */
function createTestState(overrides: Partial<TestStateType> = {}): TestStateType {
  return {
    userInput: undefined,
    platform: undefined,
    projectName: undefined,
    ...overrides,
  } as TestStateType;
}

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
        userInputProperty: 'userInput',
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
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
      expect(node.name).toBe('userInputExtraction');
    });

    it('should use provided toolExecutor', () => {
      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        toolExecutor: mockToolExecutor,
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
    });

    it('should use provided logger', () => {
      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId: 'test-input-extraction',
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
    });

    it('should allow custom userInputProperty to be specified', () => {
      // Test state with a different property name for user input
      const _CustomTestState = Annotation.Root({
        customInput: Annotation<unknown>,
        platform: Annotation<string>,
        projectName: Annotation<string>,
      });

      type CustomTestStateType = typeof _CustomTestState.State;

      function createCustomTestState(
        overrides: Partial<CustomTestStateType> = {}
      ): CustomTestStateType {
        return {
          customInput: undefined,
          platform: undefined,
          projectName: undefined,
          ...overrides,
        } as CustomTestStateType;
      }

      let capturedUserInput: unknown;
      const mockService: InputExtractionServiceProvider = {
        extractProperties: userInput => {
          capturedUserInput = userInput;
          return {
            extractedProperties: {},
          };
        },
      };

      const node = createUserInputExtractionNode<CustomTestStateType>({
        requiredProperties,
        toolId: 'test-input-extraction',
        extractionService: mockService,
        userInputProperty: 'customInput',
      });

      const state = createCustomTestState({
        customInput: 'custom input value',
      });

      node.execute(state);

      expect(capturedUserInput).toBe('custom input value');
    });

    it('should create default service with correct toolId', () => {
      const toolId = 'custom-tool-id';
      mockToolExecutor.setResult(toolId, {
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
        userInputProperty: 'userInput',
      });

      const state = createTestState({
        userInput: 'I want to create an iOS app called TestProject',
      });

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
      mockToolExecutor.setResult(toolId, {
        extractedProperties: extractedProps,
      });

      const node = createUserInputExtractionNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state = createTestState({
        userInput: 'I want to create an iOS app called MyApp',
      });

      const result = node.execute(state);

      expect(result.platform).toBe(extractedProps.platform);
      expect(result.projectName).toBe(extractedProps.projectName);
      expect(mockToolExecutor.getCallHistory().length).toBeGreaterThan(0);
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
        userInputProperty: 'userInput',
      });

      const state = createTestState({
        userInput: 'some input',
      });

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
        userInputProperty: 'userInput',
      });

      const state = createTestState({
        userInput: 'test input',
      });

      node.execute(state);

      expect(capturedUserInput).toBe('test input');
      expect(capturedProperties).toBe(requiredProperties);
    });
  });
});
