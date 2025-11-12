/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import z from 'zod';
import { BaseNode } from './abstractBaseNode.js';
import { PropertyMetadataCollection } from '../common/propertyMetadata.js';
import {
  GET_INPUT_PROPERTY_SCHEMA,
  GET_INPUT_WORKFLOW_INPUT_SCHEMA,
  GET_INPUT_WORKFLOW_RESULT_SCHEMA,
} from '../tools/utilities/getInput/metadata.js';
import { ToolExecutor, LangGraphToolExecutor } from './toolExecutor.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import { MCPToolInvocationData } from '../common/metadata.js';
import { executeToolWithLogging } from '../utils/toolExecutionUtils.js';

export type GetInputProperty = z.infer<typeof GET_INPUT_PROPERTY_SCHEMA>;

/**
 * Provider interface for user input service.
 * Allows for dependency injection and testing with mock implementations.
 */
export interface GetInputServiceProvider {
  /**
   * Solicits user input for unfulfilled properties.
   *
   * @param unfulfilledProperties - Array of properties that need user input
   * @returns The user's response (can be any type)
   */
  getInput(unfulfilledProperties: GetInputProperty[]): unknown;
}

/**
 * Configuration options for creating a Get User Input Node
 */
export interface GetUserInputNodeOptions<TState = StateType<StateDefinition>> {
  /**
   * Collection of properties that must be collected from the user
   */
  requiredProperties: PropertyMetadataCollection;

  /**
   * Tool ID for the get input tool (e.g., 'magen-get-input', 'sfmobile-native-get-input')
   * Required if getInputService is not provided
   */
  toolId?: string;

  /**
   * Service provider for getting user input (injectable for testing)
   * If not provided, a default implementation will be created using toolId
   */
  getInputService?: GetInputServiceProvider;

  /**
   * Tool executor for services (optional, defaults to LangGraphToolExecutor)
   */
  toolExecutor?: ToolExecutor;

  /**
   * Logger instance (optional, defaults to component logger)
   */
  logger?: Logger;

  /**
   * Function to check if a property is fulfilled in the state
   * Default: checks if property exists and is truthy
   */
  isPropertyFulfilled?: (state: TState, propertyName: string) => boolean;

  /**
   * Function to get the userInput field from state
   * Default: expects state.userInput
   */
  getUserInput?: (state: TState) => unknown;
}

/**
 * Factory function to create a Get User Input Node
 *
 * This node requests user input for any unfulfilled required properties.
 * It determines which properties are missing, calls the GetInputService to
 * prompt the user, and returns the user's response.
 *
 * @template TState - The state type for the workflow
 * @param options - Configuration options for the node
 * @returns A configured Get User Input Node instance
 *
 * @example
 * ```typescript
 * const MyState = Annotation.Root({
 *   userInput: Annotation<unknown>(),
 *   platform: Annotation<string>(),
 *   projectName: Annotation<string>(),
 * });
 *
 * const properties = {
 *   platform: {
 *     zodType: z.enum(['iOS', 'Android']),
 *     description: 'Target platform',
 *     friendlyName: 'platform',
 *   },
 *   projectName: {
 *     zodType: z.string(),
 *     description: 'Project name',
 *     friendlyName: 'project name',
 *   },
 * };
 *
 * const node = createGetUserInputNode({
 *   requiredProperties: properties,
 *   getInputService: myGetInputService,
 * });
 * ```
 */
export function createGetUserInputNode<TState = StateType<StateDefinition>>(
  options: GetUserInputNodeOptions<TState>
): BaseNode<TState> {
  const {
    requiredProperties,
    toolId,
    getInputService,
    toolExecutor = new LangGraphToolExecutor(),
    logger = createComponentLogger('GetUserInputNode'),
    isPropertyFulfilled = (state: TState, propertyName: string) => {
      return !!(state as Record<string, unknown>)[propertyName];
    },
  } = options;

  // Create default service implementation if not provided
  const service: GetInputServiceProvider =
    getInputService ??
    (() => {
      if (!toolId) {
        throw new Error(
          'Either toolId or getInputService must be provided to createGetUserInputNode'
        );
      }

      return {
        getInput: (unfulfilledProperties: GetInputProperty[]): unknown => {
          logger.debug('Starting input request with properties', {
            unfulfilledProperties,
          });

          const toolInvocationData: MCPToolInvocationData<typeof GET_INPUT_WORKFLOW_INPUT_SCHEMA> =
            {
              llmMetadata: {
                name: toolId,
                description:
                  'Provides a prompt to the user to elicit their input for a set of properties',
                inputSchema: GET_INPUT_WORKFLOW_INPUT_SCHEMA,
              },
              input: {
                propertiesRequiringInput: unfulfilledProperties,
              },
            };

          const validatedResult = executeToolWithLogging(
            toolExecutor,
            logger,
            toolInvocationData,
            GET_INPUT_WORKFLOW_RESULT_SCHEMA
          );

          return validatedResult.userUtterance;
        },
      };
    })();

  class GetUserInputNode extends BaseNode<TState> {
    private readonly getInputService: GetInputServiceProvider;

    constructor() {
      super('getUserInput');
      this.getInputService = service;
    }

    execute = (state: TState): Partial<TState> => {
      const unfulfilledProperties = this.getUnfulfilledProperties(state);
      const userResponse = this.getInputService.getInput(unfulfilledProperties);
      return { userInput: userResponse } as unknown as Partial<TState>;
    };

    private getUnfulfilledProperties(state: TState): GetInputProperty[] {
      const propertyArray: GetInputProperty[] = [];
      for (const [propertyName, metadata] of Object.entries(requiredProperties)) {
        if (!isPropertyFulfilled(state, propertyName)) {
          propertyArray.push({
            propertyName,
            friendlyName: metadata.friendlyName,
            description: metadata.description,
          });
        }
      }
      return propertyArray;
    }
  }

  return new GetUserInputNode();
}
