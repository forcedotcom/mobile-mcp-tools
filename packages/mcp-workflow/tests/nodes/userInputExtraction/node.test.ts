/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { UserInputExtractionNode } from '../../../src/nodes/userInputExtraction/node.js';
import { InputExtractionServiceProvider } from '../../../src/services/inputExtractionService.js';
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

describe('UserInputExtractionNode', () => {
  let mockService: InputExtractionServiceProvider;
  let requiredProperties: PropertyMetadataCollection;

  beforeEach(() => {
    mockService = {
      extractProperties: () => ({
        extractedProperties: {},
      }),
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
      const node = new UserInputExtractionNode(mockService, requiredProperties, 'userInput');

      expect(node.name).toBe('userInputExtraction');
    });
  });

  describe('execute', () => {
    it('should return extracted properties from service', () => {
      const extractedProps = {
        platform: 'iOS',
        projectName: 'TestApp',
      };
      const service: InputExtractionServiceProvider = {
        extractProperties: () => ({
          extractedProperties: extractedProps,
        }),
      };

      const node = new UserInputExtractionNode(service, requiredProperties, 'userInput');

      const state = createTestState({
        userInput: 'I want an iOS app called TestApp',
      });

      const result = node.execute(state);

      expect(result.platform).toBe(extractedProps.platform);
      expect(result.projectName).toBe(extractedProps.projectName);
    });

    it('should call service with userInput and properties', () => {
      let capturedUserInput: unknown;
      let capturedProperties: unknown;
      const service: InputExtractionServiceProvider = {
        extractProperties: (userInput, properties) => {
          capturedUserInput = userInput;
          capturedProperties = properties;
          return {
            extractedProperties: {},
          };
        },
      };

      const node = new UserInputExtractionNode(service, requiredProperties, 'userInput');

      const state = createTestState({
        userInput: 'test input string',
      });

      node.execute(state);

      expect(capturedUserInput).toBe('test input string');
      expect(capturedProperties).toBe(requiredProperties);
    });

    it('should use userInputProperty to extract userInput from state', () => {
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
      const service: InputExtractionServiceProvider = {
        extractProperties: userInput => {
          capturedUserInput = userInput;
          return {
            extractedProperties: {},
          };
        },
      };

      const node = new UserInputExtractionNode<CustomTestStateType>(
        service,
        requiredProperties,
        'customInput'
      );

      const state = createCustomTestState({
        customInput: 'custom input value',
      });

      node.execute(state);

      expect(capturedUserInput).toBe('custom input value');
    });

    it('should return empty object when no properties extracted', () => {
      const service: InputExtractionServiceProvider = {
        extractProperties: () => ({
          extractedProperties: {},
        }),
      };

      const node = new UserInputExtractionNode(service, requiredProperties, 'userInput');

      const state = createTestState({
        userInput: 'some input',
      });

      const result = node.execute(state);

      expect(result).toEqual({});
    });

    it('should return partial properties when only some are extracted', () => {
      const service: InputExtractionServiceProvider = {
        extractProperties: () => ({
          extractedProperties: {
            platform: 'Android',
            // projectName not extracted
          },
        }),
      };

      const node = new UserInputExtractionNode(service, requiredProperties, 'userInput');

      const state = createTestState({
        userInput: 'Android app',
      });

      const result = node.execute(state);

      expect(result.platform).toBe('Android');
      expect(result.projectName).toBeUndefined();
    });
  });
});
