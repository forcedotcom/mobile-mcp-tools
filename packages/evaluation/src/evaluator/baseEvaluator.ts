/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Score } from '../schema/schema.js';

/**
 * Abstract base class for evaluation agents.
 * Provides a common interface for different types of evaluators.
 */
export abstract class BaseEvaluator {
  /**
   * Abstract method that must be implemented by subclasses.
   * Evaluates the given input and returns a score.
   *
   * @param input - The input to evaluate (can be component names, LWC components, etc.)
   * @returns A promise that resolves to a Score
   */
  abstract evaluate(input: unknown): Promise<Score>;

  /**
   * Optional cleanup method for resources that need to be disposed.
   * Default implementation does nothing.
   */
  async destroy(): Promise<void> {
    // Default implementation - subclasses can override if needed
  }
}
