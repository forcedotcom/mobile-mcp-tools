/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';

/**
 * Describes the result of checking if a property is fulfilled.
 *
 * @property isFulfilled - Boolean indicating if the property is fulfilled.
 * @property reason - Optional string explaining why the property is not fulfilled.
 */
export type PropertyFulfilledResult = {
  isFulfilled: boolean;
  reason?: string;
};

/**
 * Function signature for checking if a property is fulfilled in the state.
 * It can return a boolean or a PropertyFulfilledResult for more detailed feedback.
 */
export type IsPropertyFulfilled<TState extends StateType<StateDefinition>> = (
  state: TState,
  propertyName: string
) => PropertyFulfilledResult;
