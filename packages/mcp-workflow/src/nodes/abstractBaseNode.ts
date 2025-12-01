/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';

/**
 * Base class for all workflow nodes
 *
 * @template TState - The state type for the workflow (defaults to StateType&lt;StateDefinition&gt;)
 *
 * Example:
 * ```
 * const MyWorkflowState = Annotation.Root({ count: Annotation<number> });
 * type State = typeof MyWorkflowState.State; // This is StateType<typeof MyWorkflowState.spec>
 *
 * class IncrementNode extends BaseNode<State> {
 *   constructor() {
 *     super('increment');
 *   }
 *
 *   execute = (state: State) => {
 *     return { count: state.count + 1 };
 *   };
 * }
 * ```
 */
export abstract class BaseNode<TState extends StateType<StateDefinition>> {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract execute: (state: TState) => Partial<TState>;
}
