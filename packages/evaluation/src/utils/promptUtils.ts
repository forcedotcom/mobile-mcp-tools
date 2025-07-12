/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  DEFAULT_INSTRUCTIONS,
  ASSISTANT_PREFIX,
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

export function createAssistantPrompt(mcpGroundings: string): string {
  return `${ASSISTANT_PREFIX}\n${mcpGroundings}${END_OF_PROMPT}`;
}

/**
 * Build prompt to send to LLM with system instructions and user instructions
 */
export function createLwcGenerationLLMPrompt(
  userInstructions: string,
  mcpGroundings?: string
): string {
  const promptChunks = [
    createSystemPrompt(DEFAULT_INSTRUCTIONS + LWC_INSTRUCTIONS), // system prompt
  ];
  if (mcpGroundings) {
    promptChunks.push(createAssistantPrompt(mcpGroundings)); // assistant prompt
  }
  promptChunks.push(createUserPrompt(userInstructions)); // user prompt
  return promptChunks.join('\n');
}
