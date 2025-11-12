/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  type GetInputProperty,
  type GetInputServiceProvider,
} from '@salesforce/magen-mcp-workflow';

/**
 * Test implementation of GetInputServiceProvider that returns pre-configured user input.
 * Useful for unit testing nodes without requiring actual user interaction.
 *
 * Usage:
 * ```typescript
 * const mockService = new MockGetInputService();
 * mockService.setUserInput('iOS');
 * const node = new SomeNode(mockService);
 * ```
 */
export class MockGetInputService implements GetInputServiceProvider {
  private userInput: unknown = 'Mock user input';
  private callHistory: Array<{ unfulfilledProperties: GetInputProperty[] }> = [];

  /**
   * Configures the mock to return a specific user input.
   *
   * @param userInput The user input to return
   */
  setUserInput(userInput: unknown): void {
    this.userInput = userInput;
  }

  /**
   * Mock implementation of getInput.
   * Records the call and returns the pre-configured user input.
   *
   * @param unfulfilledProperties The properties requiring user input
   * @returns The pre-configured user input
   */
  getInput(unfulfilledProperties: GetInputProperty[]): unknown {
    this.callHistory.push({ unfulfilledProperties });
    return this.userInput;
  }

  /**
   * Returns the history of all input requests.
   * Useful for asserting that the service was called with correct parameters.
   */
  getCallHistory(): ReadonlyArray<{ unfulfilledProperties: GetInputProperty[] }> {
    return [...this.callHistory];
  }

  /**
   * Returns the most recent call, or undefined if no calls have been made.
   */
  getLastCall(): { unfulfilledProperties: GetInputProperty[] } | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Clears the call history and resets the user input to default.
   */
  reset(): void {
    this.userInput = 'Mock user input';
    this.callHistory = [];
  }
}
