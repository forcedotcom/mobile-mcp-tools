/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { createGetUserInputNode } from '../../../src/nodes/getUserInput/factory.js';
import { GetInputServiceProvider } from '../../../src/services/getInputService.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { PropertyMetadataCollection } from '../../../src/common/propertyMetadata.js';
import { PropertyFulfilledResult } from '../../../src/common/types.js';

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
 * This helper handles the tension between TypeScript's strict typing and
 * LangGraph's partial state management.
 */
function createTestState(overrides: Partial<TestStateType> = {}): TestStateType {
  return {
    userInput: undefined,
    platform: undefined,
    projectName: undefined,
    ...overrides,
  } as TestStateType;
}

describe('createGetUserInputNode', () => {
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
    it('should create a node with default service when getInputService not provided', () => {
      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
      expect(node.name).toBe('getUserInput');
    });

    it('should create a node with provided service', () => {
      const mockService: GetInputServiceProvider = {
        getInput: () => 'test response',
      };

      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        getInputService: mockService,
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
      expect(node.name).toBe('getUserInput');
    });

    it('should use provided toolExecutor', () => {
      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        toolExecutor: mockToolExecutor,
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
    });

    it('should use provided logger', () => {
      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
    });

    it('should use custom isPropertyFulfilled function', () => {
      const customIsFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        if (propertyName === 'platform') {
          const isFulfilled = state.platform === 'iOS';
          return isFulfilled
            ? { isFulfilled: true }
            : {
                isFulfilled: false,
                reason: `Property '${propertyName}' is not 'iOS'.`,
              };
        }
        const isFulfilled = !!state.projectName;
        return isFulfilled
          ? { isFulfilled: true }
          : {
              isFulfilled: false,
              reason: `Property '${propertyName}' is missing from the workflow state.`,
            };
      };

      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        isPropertyFulfilled: customIsFulfilled,
        userInputProperty: 'userInput',
      });

      expect(node).toBeDefined();
    });

    it('should create default service with correct toolId', () => {
      const toolId = 'custom-tool-id';
      mockToolExecutor.setResult(toolId, {
        userUtterance: 'test response',
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state = createTestState();

      // Execute node - it should call the service
      const result = node.execute(state);
      expect(result).toHaveProperty('userInput');
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

      const customRequiredProperties: PropertyMetadataCollection = {
        platform: {
          zodType: z.enum(['iOS', 'Android']),
          description: 'Target platform',
          friendlyName: 'platform',
        },
      };

      const toolId = 'custom-tool-id';
      const userResponse = 'iOS';
      mockToolExecutor.setResult(toolId, {
        userUtterance: userResponse,
      });

      const node = createGetUserInputNode<CustomTestStateType>({
        requiredProperties: customRequiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'customInput', // Custom property name
      });

      const state = createCustomTestState();

      const result = node.execute(state);

      // Should write to 'customInput' property instead of 'userInput'
      expect(result).toHaveProperty('customInput');
      expect(result.customInput).toBe(userResponse);
    });
  });

  describe('Node execution with default service', () => {
    it('should request input for unfulfilled properties', () => {
      const toolId = 'test-get-input';
      const userResponse = 'iOS';
      mockToolExecutor.setResult(toolId, {
        userUtterance: userResponse,
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state = createTestState();

      const result = node.execute(state);

      expect(result.userInput).toBe(userResponse);
      expect(mockToolExecutor.getCallHistory().length).toBeGreaterThan(0);
    });

    it('should use default isPropertyFulfilled when properties are missing', () => {
      const toolId = 'test-get-input';
      mockToolExecutor.setResult(toolId, {
        userUtterance: 'test',
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state = createTestState();

      const result = node.execute(state);
      expect(result).toHaveProperty('userInput');
    });

    it('should skip fulfilled properties', () => {
      const toolId = 'test-get-input';
      mockToolExecutor.setResult(toolId, {
        userUtterance: 'MyProject',
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state = createTestState({
        platform: 'iOS', // Already fulfilled
      });

      const result = node.execute(state);
      expect(result).toHaveProperty('userInput');
    });
  });

  describe('Node execution with custom service', () => {
    it('should use provided service', () => {
      const mockService: GetInputServiceProvider = {
        getInput: () => 'custom response',
      };

      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        getInputService: mockService,
        userInputProperty: 'userInput',
      });

      const state = createTestState();

      const result = node.execute(state);
      expect(result.userInput).toBe('custom response');
    });

    it('should pass unfulfilled properties to service', () => {
      let capturedProperties: unknown;
      const mockService: GetInputServiceProvider = {
        getInput: properties => {
          capturedProperties = properties;
          return 'response';
        },
      };

      const node = createGetUserInputNode({
        requiredProperties,
        toolId: 'test-get-input',
        getInputService: mockService,
        userInputProperty: 'userInput',
      });

      const state = createTestState();

      node.execute(state);

      expect(capturedProperties).toBeDefined();
      expect(Array.isArray(capturedProperties)).toBe(true);
    });
  });
});
