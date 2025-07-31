/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Extracts JSON response from LLM output
 * @param llmResponse - The raw response from the LLM
 * @returns The JSON string extracted from the response
 * @throws Error if no JSON response is found
 */
export function getJsonResponse(llmResponse: string): string {
  const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  // Sometimes LLM returns the json without the ```json\n and \n``` tags
  if (
    (llmResponse.startsWith('{') && llmResponse.endsWith('}')) ||
    (llmResponse.startsWith('[') && llmResponse.endsWith(']'))
  ) {
    return llmResponse;
  }
  throw new Error('No JSON response found in LLM output');
}
