/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from '../abstractBaseNode.js';
import { PropertyMetadataCollection } from '../../common/propertyMetadata.js';
import { IsPropertyFulfilled } from '../../common/types.js';
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
  isPropertyFulfilled?: IsPropertyFulfilled<TState>;

  /**
   * Property name in state that contains user input to extract from.
   * Must be a valid property of TState.
   *
   * @example
   *
   * // State has a 'userInput' property
   * createGetUserInputNode({
   *   userInputProperty: 'userInput',
   *   ...
   * });
   *
   * // State has a 'currentUtterance' property
   * createGetUserInputNode({
   *   userInputProperty: 'currentUtterance',
   *   ...
   * });
   *
   */
  userInputProperty: keyof TState;

  /**
   * Custom name for the node (optional, defaults to 'getUserInput')
   * Use this when you need multiple getUserInput nodes in the same graph
   *
   * @example
   *
   * // Create multiple input nodes with unique names
   * const userInputNode = createGetUserInputNode({
   *   nodeName: 'getUserInput',
   *   ...
   * });
   *
   * const androidSetupNode = createGetUserInputNode({
   *   nodeName: 'getAndroidSetup',
   *   ...
   * });
   */
  nodeName?: string;
}

export class GetUserInputNode<TState extends StateType<StateDefinition>> extends BaseNode<TState> {
  constructor(
    private readonly getInputService: GetInputServiceProvider,
    private readonly requiredProperties: PropertyMetadataCollection,
    private readonly isPropertyFulfilled: IsPropertyFulfilled<TState>,
    private readonly userInputProperty: keyof TState,
    nodeName: string = 'getUserInput'
  ) {
    super(nodeName);
  }

  execute = (state: TState): Partial<TState> => {
    const unfulfilledProperties = this.getUnfulfilledProperties(state);
    const userResponse = this.getInputService.getInput(unfulfilledProperties);
    return { [this.userInputProperty]: userResponse } as unknown as Partial<TState>;
  };

  private getUnfulfilledProperties(state: TState): GetInputProperty[] {
    const propertyArray: GetInputProperty[] = [];
    for (const [propertyName, metadata] of Object.entries(
      this.requiredProperties as PropertyMetadataCollection
    )) {
      const fulfillmentResult = this.isPropertyFulfilled(state, propertyName);

      if (!fulfillmentResult.isFulfilled) {
        propertyArray.push({
          propertyName,
          friendlyName: metadata.friendlyName,
          description: metadata.description,
          reason: fulfillmentResult.reason,
        });
      }
    }
    return propertyArray;
  }
}
