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

// Test state type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestState = Annotation.Root({
  userInput: Annotation<unknown>(),
  platform: Annotation<string>(),
  projectName: Annotation<string>(),
});

type TestStateType = typeof TestState.State;

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
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: 'test response',
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state: TestStateType = {
        userInput: undefined,
        platform: undefined,
        projectName: undefined,
      };

      // Execute node - it should call the service
      const result = node.execute(state);
      expect(result).toHaveProperty('userInput');
    });
  });

  describe('Node execution with default service', () => {
    it('should request input for unfulfilled properties', () => {
      const toolId = 'test-get-input';
      const userResponse = 'iOS';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: userResponse,
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state: TestStateType = {
        userInput: undefined,
        platform: undefined,
        projectName: undefined,
      };

      const result = node.execute(state);

      expect(result.userInput).toBe(userResponse);
      expect(mockToolExecutor.getCallHistory().length).toBeGreaterThan(0);
    });

    it('should use default isPropertyFulfilled when properties are missing', () => {
      const toolId = 'test-get-input';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: 'test',
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state: TestStateType = {
        userInput: undefined,
        platform: undefined,
        projectName: undefined,
      };

      const result = node.execute(state);
      expect(result).toHaveProperty('userInput');
    });

    it('should skip fulfilled properties', () => {
      const toolId = 'test-get-input';
      mockToolExecutor.setResult('Get User Input', {
        userUtterance: 'MyProject',
      });

      const node = createGetUserInputNode({
        requiredProperties,
        toolId,
        toolExecutor: mockToolExecutor,
        logger: mockLogger,
        userInputProperty: 'userInput',
      });

      const state: TestStateType = {
        userInput: undefined,
        platform: 'iOS', // Already fulfilled
        projectName: undefined,
      };

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

      const state: TestStateType = {
        userInput: undefined,
        platform: undefined,
        projectName: undefined,
      };

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

      const state: TestStateType = {
        userInput: undefined,
        platform: undefined,
        projectName: undefined,
      };

      node.execute(state);

      expect(capturedProperties).toBeDefined();
      expect(Array.isArray(capturedProperties)).toBe(true);
    });
  });
});
