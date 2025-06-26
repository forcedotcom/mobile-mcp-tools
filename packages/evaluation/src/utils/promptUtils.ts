/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  DEFAULT_INSTRUCTIONS,
  END_OF_PROMPT,
  LWC_INSTRUCTIONS,
  SYSTEM_PREFIX,
  USER_PREFIX,
} from './constants.js';

export function createSystemPrompt(systemInstructions: string): string {
  return `${SYSTEM_PREFIX}\n${systemInstructions}${END_OF_PROMPT}`;
}

export function createUserPrompt(userInstructions: string): string {
  return `${USER_PREFIX}\n${userInstructions}${END_OF_PROMPT}`;
}

/**
 * Build prompt to send to LLM with system instructions and user instructions
 */
export function createLwcGenerationLLMPrompt(userInstructions: string): string {
  const systemPrompt = createSystemPrompt(DEFAULT_INSTRUCTIONS + LWC_INSTRUCTIONS);
  const userPrompt = createUserPrompt(userInstructions);
  return `${systemPrompt}\n${userPrompt}`;
}
