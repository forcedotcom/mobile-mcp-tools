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
import { InputExtractionServiceProvider } from '../../services/inputExtractionService.js';

/**
 * Configuration options for creating a User Input Extraction Node
 */
export interface UserInputExtractionNodeOptions<TState extends StateType<StateDefinition>> {
  /**
   * Collection of properties that must be collected from user
   */
  requiredProperties: PropertyMetadataCollection;

  /**
   * Tool ID for the input extraction tool (e.g., 'magen-input-extraction', 'sfmobile-native-input-extraction')
   * Required if extractionService is not provided
   */
  toolId: string;

  /**
   * Service provider for property extraction (injectable for testing)
   * If not provided, a default implementation will be created using toolId
   */
  extractionService?: InputExtractionServiceProvider;

  /**
   * Tool executor for services (optional, defaults to LangGraphToolExecutor)
   */
  toolExecutor?: ToolExecutor;

  /**
   * Logger instance (optional, defaults to component logger)
   */
  logger?: Logger;

  /**
   * Property name in state that contains user input to extract from.
   * Must be a valid property of TState.
   *
   * @example
   *
   * // State has a 'userInput' property
   * createUserInputExtractionNode({
   *   userInputProperty: 'userInput',
   *   ...
   * });
   *
   * // State has a 'currentUtterance' property
   * createUserInputExtractionNode({
   *   userInputProperty: 'currentUtterance',
   *   ...
   * });
   *
   */
  userInputProperty: keyof TState;
}

export class UserInputExtractionNode<
  TState extends StateType<StateDefinition>,
> extends BaseNode<TState> {
  constructor(
    private readonly extractionService: InputExtractionServiceProvider,
    private readonly requiredProperties: PropertyMetadataCollection,
    private readonly userInputProperty: keyof TState
  ) {
    super('userInputExtraction');
  }

  execute = (state: TState): Partial<TState> => {
    const userInput = state[this.userInputProperty];
    const result = this.extractionService.extractProperties(userInput, this.requiredProperties);
    return result.extractedProperties as unknown as Partial<TState>;
  };
}
