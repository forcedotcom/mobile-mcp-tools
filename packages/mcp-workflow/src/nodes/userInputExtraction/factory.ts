/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import { BaseNode } from '../abstractBaseNode.js';
import { LangGraphToolExecutor } from '../toolExecutor.js';
import { createComponentLogger } from '../../logging/logger.js';
import {
  InputExtractionService,
  InputExtractionServiceProvider,
} from '../../services/inputExtractionService.js';
import { UserInputExtractionNodeOptions, UserInputExtractionNode } from './node.js';

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
