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
import { GetInputService, GetInputServiceProvider } from '../../services/getInputService.js';
import { GetUserInputNodeOptions, GetUserInputNode } from './node.js';
import { PropertyFulfilledResult } from '../../common/types.js';

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
export function createGetUserInputNode<TState extends StateType<StateDefinition>>(
  options: GetUserInputNodeOptions<TState>
): BaseNode<TState> {
  const {
    requiredProperties,
    toolId,
    getInputService,
    toolExecutor = new LangGraphToolExecutor(),
    logger = createComponentLogger('GetUserInputNode'),
    isPropertyFulfilled = (state: TState, propertyName: string): PropertyFulfilledResult => {
      const isFulfilled = !!state[propertyName];
      if (isFulfilled) {
        return { isFulfilled: true };
      }
      return {
        isFulfilled: false,
        reason: `Property '${propertyName}' is missing from the workflow state.`,
      };
    },
    userInputProperty,
  } = options;

  // Create default service implementation if not provided
  const service: GetInputServiceProvider =
    getInputService ?? new GetInputService(toolId, toolExecutor, logger);

  return new GetUserInputNode(service, requiredProperties, isPropertyFulfilled, userInputProperty);
}
