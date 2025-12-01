/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { GetUserInputNode } from '../../../src/nodes/getUserInput/node.js';
import { GetInputServiceProvider } from '../../../src/services/getInputService.js';
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
 */
function createTestState(overrides: Partial<TestStateType> = {}): TestStateType {
  return {
    userInput: undefined,
    platform: undefined,
    projectName: undefined,
    ...overrides,
  } as TestStateType;
}

describe('GetUserInputNode', () => {
  let mockService: GetInputServiceProvider;
  let requiredProperties: PropertyMetadataCollection;

  beforeEach(() => {
    mockService = {
      getInput: () => 'test response',
    };
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

  describe('Constructor', () => {
    it('should initialize with correct name', () => {
      const isPropertyFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        const isFulfilled = !!(state as Record<string, unknown>)[propertyName];
        if (isFulfilled) {
          return { isFulfilled: true };
        }
        return {
          isFulfilled: false,
          reason: `Property '${propertyName}' is missing from the workflow state.`,
        };
      };

      const node = new GetUserInputNode(
        mockService,
        requiredProperties,
        isPropertyFulfilled,
        'userInput'
      );

      expect(node.name).toBe('getUserInput');
    });
  });

  describe('execute', () => {
    it('should return userInput from service', () => {
      const userResponse = 'iOS';
      const service: GetInputServiceProvider = {
        getInput: () => userResponse,
      };

      const isPropertyFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        const isFulfilled = !!(state as Record<string, unknown>)[propertyName];
        if (isFulfilled) {
          return { isFulfilled: true };
        }
        return {
          isFulfilled: false,
          reason: `Property '${propertyName}' is missing from the workflow state.`,
        };
      };

      const node = new GetUserInputNode(
        service,
        requiredProperties,
        isPropertyFulfilled,
        'userInput'
      );

      const state = createTestState();

      const result = node.execute(state);

      expect(result.userInput).toBe(userResponse);
    });

    it('should call service with unfulfilled properties', () => {
      let capturedProperties: unknown;
      const service: GetInputServiceProvider = {
        getInput: properties => {
          capturedProperties = properties;
          return 'response';
        },
      };

      const isPropertyFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        const isFulfilled = !!(state as Record<string, unknown>)[propertyName];
        if (isFulfilled) {
          return { isFulfilled: true };
        }
        return {
          isFulfilled: false,
          reason: `Property '${propertyName}' is missing from the workflow state.`,
        };
      };

      const node = new GetUserInputNode(
        service,
        requiredProperties,
        isPropertyFulfilled,
        'userInput'
      );

      const state = createTestState();

      node.execute(state);

      expect(capturedProperties).toBeDefined();
      expect(Array.isArray(capturedProperties)).toBe(true);
      expect((capturedProperties as Array<unknown>).length).toBe(2);
    });

    it('should filter out fulfilled properties', () => {
      let capturedProperties: unknown;
      const service: GetInputServiceProvider = {
        getInput: properties => {
          capturedProperties = properties;
          return 'response';
        },
      };

      const isPropertyFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        const isFulfilled = !!(state as Record<string, unknown>)[propertyName];
        if (isFulfilled) {
          return { isFulfilled: true };
        }
        return {
          isFulfilled: false,
          reason: `Property '${propertyName}' is missing from the workflow state.`,
        };
      };

      const node = new GetUserInputNode(
        service,
        requiredProperties,
        isPropertyFulfilled,
        'userInput'
      );

      const state = createTestState({
        platform: 'iOS', // Fulfilled
      });

      node.execute(state);

      expect(capturedProperties).toBeDefined();
      expect(Array.isArray(capturedProperties)).toBe(true);
      expect((capturedProperties as Array<unknown>).length).toBe(1);
    });

    it('should include property metadata in unfulfilled properties', () => {
      let capturedProperties: unknown;
      const service: GetInputServiceProvider = {
        getInput: properties => {
          capturedProperties = properties;
          return 'response';
        },
      };

      const isPropertyFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        const isFulfilled = !!(state as Record<string, unknown>)[propertyName];
        if (isFulfilled) {
          return { isFulfilled: true };
        }
        return {
          isFulfilled: false,
          reason: `Property '${propertyName}' is missing from the workflow state.`,
        };
      };

      const node = new GetUserInputNode(
        service,
        requiredProperties,
        isPropertyFulfilled,
        'userInput'
      );

      const state = createTestState();

      node.execute(state);

      expect(capturedProperties).toBeDefined();
      const props = capturedProperties as Array<{
        propertyName: string;
        friendlyName: string;
        description: string;
      }>;
      expect(props[0]).toHaveProperty('propertyName');
      expect(props[0]).toHaveProperty('friendlyName');
      expect(props[0]).toHaveProperty('description');
    });

    it('should return empty array when all properties are fulfilled', () => {
      let capturedProperties: unknown;
      const service: GetInputServiceProvider = {
        getInput: properties => {
          capturedProperties = properties;
          return 'response';
        },
      };

      const isPropertyFulfilled = (
        state: TestStateType,
        propertyName: string
      ): PropertyFulfilledResult => {
        const isFulfilled = !!(state as Record<string, unknown>)[propertyName];
        if (isFulfilled) {
          return { isFulfilled: true };
        }
        return {
          isFulfilled: false,
          reason: `Property '${propertyName}' is missing from the workflow state.`,
        };
      };

      const node = new GetUserInputNode(
        service,
        requiredProperties,
        isPropertyFulfilled,
        'userInput'
      );

      const state = createTestState({
        platform: 'iOS', // Fulfilled
        projectName: 'MyProject', // Fulfilled
      });

      node.execute(state);

      expect(capturedProperties).toBeDefined();
      expect(Array.isArray(capturedProperties)).toBe(true);
      expect((capturedProperties as Array<unknown>).length).toBe(0);
    });
  });
});
