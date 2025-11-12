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

// Test state type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestState = Annotation.Root({
  userInput: Annotation<unknown>(),
  platform: Annotation<string>(),
  projectName: Annotation<string>(),
});

type TestStateType = typeof TestState.State;

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
      const getUserInput = (state: TestStateType) => state.userInput;

      const node = new UserInputExtractionNode(mockService, requiredProperties, getUserInput);

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

      const getUserInput = (state: TestStateType) => state.userInput;

      const node = new UserInputExtractionNode(service, requiredProperties, getUserInput);

      const state: TestStateType = {
        userInput: 'I want an iOS app called TestApp',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

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

      const getUserInput = (state: TestStateType) => state.userInput;

      const node = new UserInputExtractionNode(service, requiredProperties, getUserInput);

      const state: TestStateType = {
        userInput: 'test input string',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      node.execute(state);

      expect(capturedUserInput).toBe('test input string');
      expect(capturedProperties).toBe(requiredProperties);
    });

    it('should use getUserInput function to extract userInput from state', () => {
      let capturedUserInput: unknown;
      const service: InputExtractionServiceProvider = {
        extractProperties: userInput => {
          capturedUserInput = userInput;
          return {
            extractedProperties: {},
          };
        },
      };

      const customGetUserInput = (state: TestStateType) => {
        return (state as Record<string, unknown>).customInput;
      };

      const node = new UserInputExtractionNode(service, requiredProperties, customGetUserInput);

      const state: TestStateType = {
        userInput: undefined,
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
        customInput: 'custom input value',
      } as TestStateType & { customInput: string };

      node.execute(state);

      expect(capturedUserInput).toBe('custom input value');
    });

    it('should return empty object when no properties extracted', () => {
      const service: InputExtractionServiceProvider = {
        extractProperties: () => ({
          extractedProperties: {},
        }),
      };

      const getUserInput = (state: TestStateType) => state.userInput;

      const node = new UserInputExtractionNode(service, requiredProperties, getUserInput);

      const state: TestStateType = {
        userInput: 'some input',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

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

      const getUserInput = (state: TestStateType) => state.userInput;

      const node = new UserInputExtractionNode(service, requiredProperties, getUserInput);

      const state: TestStateType = {
        userInput: 'Android app',
        platform: undefined as unknown as string,
        projectName: undefined as unknown as string,
      };

      const result = node.execute(state);

      expect(result.platform).toBe('Android');
      expect(result.projectName).toBeUndefined();
    });
  });
});
