/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { getLwcComponentFromLlmResponse, LWCComponent as LwcComponent } from '../utils/lwcUtils.js';
import { createLwcGenerationLLMPrompt } from '../utils/promptUtils.js';
import { LlmClient } from '../llmclient/llmClient.js';

const NO_FURTHER_QUESTIONS_PROMPT = `DO NOT ask further questions for clarification, do your best to implement based on requirements.`;

/**
 * This class calls the LLM model to generate an LWC component from a user prompt.
 */
class LwcComponentAgent {
  private readonly llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  async generateLwcComponent(userPrompt: string, mcpGroundings: string): Promise<LwcComponent> {
    // Append a prompt to the user prompt to prevent asking further questions for clarification
    const prompt = createLwcGenerationLLMPrompt(
      `${userPrompt}\n${NO_FURTHER_QUESTIONS_PROMPT}`,
      mcpGroundings
    );
    const llmResponse = await this.llmClient.callLLM(prompt);
    const component = getLwcComponentFromLlmResponse(llmResponse);
    return component;
  }
}

export default LwcComponentAgent;
