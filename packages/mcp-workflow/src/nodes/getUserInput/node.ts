/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from '../abstractBaseNode.js';
import { PropertyMetadataCollection } from '../../common/propertyMetadata.js';
import { ToolExecutor } from '../toolExecutor.js';
import { Logger } from '../../logging/logger.js';
import { GetInputProperty, GetInputServiceProvider } from '../../services/getInputService.js';

/**
 * Configuration options for creating a Get User Input Node
 */
export interface GetUserInputNodeOptions<TState extends StateType<StateDefinition>> {
  /**
   * Collection of properties that must be collected from the user
   */
  requiredProperties: PropertyMetadataCollection;

  /**
   * Tool ID for the get input tool (e.g., 'magen-get-input', 'sfmobile-native-get-input')
   * Required if getInputService is not provided
   */
  toolId: string;

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

export class GetUserInputNode<TState> extends BaseNode<TState> {
  constructor(
    private readonly getInputService: GetInputServiceProvider,
    private readonly requiredProperties: PropertyMetadataCollection,
    private readonly isPropertyFulfilled: (state: TState, propertyName: string) => boolean
  ) {
    super('getUserInput');
  }

  execute = (state: TState): Partial<TState> => {
    const unfulfilledProperties = this.getUnfulfilledProperties(state);
    const userResponse = this.getInputService.getInput(unfulfilledProperties);
    return { userInput: userResponse } as unknown as Partial<TState>;
  };

  private getUnfulfilledProperties(state: TState): GetInputProperty[] {
    const propertyArray: GetInputProperty[] = [];
    for (const [propertyName, metadata] of Object.entries(this.requiredProperties)) {
      if (!this.isPropertyFulfilled(state, propertyName)) {
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
