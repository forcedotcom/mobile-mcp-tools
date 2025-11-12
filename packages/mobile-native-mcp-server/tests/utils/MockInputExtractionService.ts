/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PropertyMetadataCollection } from '../../src/common/propertyMetadata.js';
import {
  type ExtractionResult,
  type InputExtractionServiceProvider,
} from '@salesforce/magen-mcp-workflow';

/**
 * Test implementation of IInputExtractionService that returns pre-configured results.
 * Useful for unit testing nodes without requiring the full LLM extraction pipeline.
 *
 * Usage:
 * ```typescript
 * const mockService = new MockInputExtractionService();
 * mockService.setResult({ extractedProperties: { platform: 'iOS' } });
 * const node = new InitialUserInputExtractionNode(mockService);
 * ```
 */
export class MockInputExtractionService implements InputExtractionServiceProvider {
  private result: ExtractionResult = { extractedProperties: {} };
  private callHistory: Array<{
    userInput: unknown;
    properties: PropertyMetadataCollection;
  }> = [];

  /**
   * Configures the mock to return a specific result.
   *
   * @param result The extraction result to return
   */
  setResult(result: ExtractionResult): void {
    this.result = result;
  }

  /**
   * Mock implementation of extractProperties.
   * Records the call and returns the pre-configured result.
   *
   * @param userInput The user input being extracted from
   * @param properties The properties being extracted
   * @returns The pre-configured extraction result
   */
  extractProperties(userInput: unknown, properties: PropertyMetadataCollection): ExtractionResult {
    this.callHistory.push({ userInput, properties });
    return this.result;
  }

  /**
   * Returns the history of all extraction calls.
   * Useful for asserting that the service was called with correct parameters.
   */
  getCallHistory(): ReadonlyArray<{
    userInput: unknown;
    properties: PropertyMetadataCollection;
  }> {
    return [...this.callHistory];
  }

  /**
   * Returns the most recent extraction call, or undefined if no calls have been made.
   */
  getLastCall():
    | {
        userInput: unknown;
        properties: PropertyMetadataCollection;
      }
    | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Clears the call history and resets the result to default.
   */
  reset(): void {
    this.result = { extractedProperties: {} };
    this.callHistory = [];
  }
}
