/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from './abstractBaseNode.js';
import { PropertyMetadataCollection } from '../common/propertyMetadata.js';
import { ToolExecutor, LangGraphToolExecutor } from './toolExecutor.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import {
  InputExtractionService,
  InputExtractionServiceProvider,
} from '../services/inputExtractionService.js';

/**
 * Configuration options for creating a User Input Extraction Node
 */
export interface UserInputExtractionNodeOptions<TState = StateType<StateDefinition>> {
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
   * Function to get the userInput field from state
   * Default: expects state.userInput
   */
  getUserInput?: (state: TState) => unknown;
}

class UserInputExtractionNode<TState> extends BaseNode<TState> {
  constructor(
    private readonly extractionService: InputExtractionServiceProvider,
    private readonly requiredProperties: PropertyMetadataCollection,
    private readonly getUserInput: (state: TState) => unknown
  ) {
    super('userInputExtraction');
  }

  execute = (state: TState): Partial<TState> => {
    const userInput = this.getUserInput(state);
    const result = this.extractionService.extractProperties(userInput, this.requiredProperties);
    return result.extractedProperties as unknown as Partial<TState>;
  };
}

/**
 * Factory function to create a User Input Extraction Node
 *
 * This node extracts structured properties from user input using LLM-based
 * natural language understanding. It takes raw user input and attempts to extract
 * as many workflow properties as possible.
 *
 * @template TState - The state type for the workflow
 * @param options - Configuration options for the node
 * @returns A configured User Input Extraction Node instance
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
 * const node = createUserInputExtractionNode({
 *   requiredProperties: properties,
 *   extractionService: myExtractionService,
 * });
 * ```
 */
export function createUserInputExtractionNode<TState = StateType<StateDefinition>>(
  options: UserInputExtractionNodeOptions<TState>
): BaseNode<TState> {
  const {
    requiredProperties,
    toolId,
    extractionService,
    toolExecutor = new LangGraphToolExecutor(),
    logger = createComponentLogger('UserInputExtractionNode'),
    getUserInput = (state: TState) => {
      return (state as Record<string, unknown>).userInput;
    },
  } = options;

  // Create default service implementation if not provided
  const service: InputExtractionServiceProvider =
    extractionService ?? new InputExtractionService(toolId, toolExecutor, logger);

  return new UserInputExtractionNode(service, requiredProperties, getUserInput);
}
