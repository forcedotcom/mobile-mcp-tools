/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ModelConfig } from './modelConfig.js';
import { GENERATION_MAX_TOKENS } from './constants.js';

export enum StreamType {
  ERROR = 'error', // Model/Gateway error
  GENERATION = 'generation', // Successful generation
}

interface GenerationChunk {
  text: string;
  parameters?: {
    finish_reason?: string;
    prompt_tokens?: number;
    generated_tokens?: number;
  };
}

interface GenerationEvent {
  generations: GenerationChunk[];
}

interface ErrorEvent {
  errorCode: string;
}

type StreamEvent = GenerationEvent | ErrorEvent;

function isGenerationEvent(event: StreamEvent): event is GenerationEvent {
  return 'generations' in event;
}

function isErrorEvent(event: StreamEvent): event is ErrorEvent {
  return 'errorCode' in event;
}

/**
 * This class is the client to interact with LLM model.
 * It provides the base functionality for calling the LLM model and
 * converts stream response back to string response.
 *
 * Note: QWen LLM doesn't support non-stream response while openAI supports it.
 * Otherwise we will use non-stream response pattern which is easier to implement and better for performance.
 */
export class LlmClient {
  protected readonly modelConfig: ModelConfig;

  constructor(modelConfig: ModelConfig) {
    this.modelConfig = modelConfig;
  }

  /**
   * Call the LLM API and return the response in string format
   * @param prompt the prompt to the LLM
   * @returns the response from the LLM
   */
  async callLLM(userMessageContent: string): Promise<string> {
    const url = `${this.modelConfig.baseUrl}/generations/stream`;
    const headers = {
      'Content-Type': 'application/json',
      'X-LLM-Provider': this.modelConfig.provider,
      'X-Sfdc-Core-Tenant-Id': this.modelConfig.tenantId,
      'X-Client-Feature-Id': this.modelConfig.clientFeatureID,
      Authorization: `API_KEY ${this.modelConfig.apiKey}`,
    };

    // use OPENAI format for user message and request object by default
    const userMessage = {
      role: 'user',
      content: userMessageContent,
    };
    const prompt = JSON.stringify([userMessage]);
    const requestObject = {
      model: this.modelConfig.model,
      prompt,
      max_tokens: GENERATION_MAX_TOKENS,
    };

    const body = JSON.stringify(requestObject);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    if (!response || !response.body) {
      const error = new Error(
        `Failed the http post call to ${url}. Status: ${response.status}. Status Text: ${response.statusText}`
      );
      const errorWithResponse = error as Error & { response?: Response };
      errorWithResponse.response = response;
      throw errorWithResponse;
    }

    // convert the LLM stream to a string
    return await this.streamToText(response.body);
  }

  /**
   * Convert the stream to a string
   * @param stream the stream to convert
   * @returns the string result
   *
   * Here is the example of the stream content:
   *
   * event: generation
   * data: {"id":"chatcmpl-BcwLQjXud05JpU7YUtiKObSYGWww9","generations":[{"id":"7251e2bc-cfa3-458d-9d37-9044ddeab9e3","text":"","parameters":{"finish_reason":null,"refusal":null,"index":0,"logprobs":null},"generation_safety_score":null,"generation_content_quality":null}],"prompt":null,"input_safety_score":null,"input_bias_score":null,"parameters":{"provider":"openai","created":1748620440,"model":"gpt-4o-mini-2024-07-18","system_fingerprint":"fp_34a54ae93c","object":"chat.completion.chunk"}}
   * ...
   *
   * event: scoringStarted
   * data: {}
   *
   * event: scores
   * data: {"id":"chatcmpl-BcwLQjXud05JpU7YUtiKObSYGWww9","generations":[{"id":"7251e2bc-cfa3-458d-9d37-9044ddeab9e3","text":"Here's a simple \"Hello, World!\" program in JavaScript:\n\n```javascript\nconsole.log(\"Hello, World!\");\n```\n\nYou can run this code in a web browser's console or in a Node.js environment.","parameters":{"finish_reason":null,"refusal":null,"index":0,"logprobs":null},"generation_safety_score":{"severity_level":null,"safety_score":0.9999987,"category_scores":{"toxicity":0.0,"hate":0.0,"identity":0.0,"violence":0.0,"physical":0.0,"sexual":0.0,"profanity":0.0,"biased":0.0}},"generation_content_quality":{"is_toxicity_detected":false,"is_bias_detected":null,"bias_score":null}}],"prompt":null,"input_safety_score":null,"input_bias_score":null,"parameters":null}
   *
   * event: scoringCompleted
   * data: {}
   */
  async streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
    let result = '';
    const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // Ref: xGen API https://salesforce.quip.com/b9aJAKS55Oya

      const data = this.processStream(value, StreamType.GENERATION);
      if (data && isGenerationEvent(data)) {
        result += data.generations.map((chunk: { text: string }) => chunk.text).join('');
        const parameters = data.generations[0]?.parameters;
        const finishReason = parameters?.finish_reason;
        if (finishReason) {
          if (finishReason === 'length') {
            console.error(
              '[ERROR] xGen response terminated before completion due to reaching max tokens limit!'
            );
          }
        }
        continue; // As long as we receive successful generation stream continue ...
      }

      const error = this.processStream(value, StreamType.ERROR);
      if (error && isErrorEvent(error)) {
        console.error('LLM/Gateway error:', error);
        const errorResponse = new Error(`LLM/Gateway call failed due to: ${error.errorCode}`);
        errorResponse.stack = JSON.stringify(error);
        throw errorResponse;
      }
    }

    return result;
  }

  //  process the stream and return the event or events.
  // For generation, value could have multiple 'generation' events, merge them into one event.
  processStream(value: string, streamType: StreamType): StreamEvent | null {
    const eventSeparator = `event: ${streamType}\n`;

    const trimmedValue = value.trim();
    // return null if there is no specified stream type
    if (trimmedValue.indexOf(eventSeparator) !== 0) {
      return undefined;
    }

    const events = trimmedValue.trim().split(eventSeparator).filter(Boolean);

    if (events.length > 0) {
      const event = this.getEvent(events[0]);
      if (streamType === StreamType.GENERATION && isGenerationEvent(event)) {
        for (let i = 1; i < events.length; i++) {
          const moreEvent = this.getEvent(events[i]);
          if (moreEvent && isGenerationEvent(moreEvent)) {
            event.generations.push(moreEvent.generations[0]);
          }
        }
      }
      return event;
    }
  }

  private getEvent(value: string): StreamEvent | null {
    const startIndex = value.indexOf('{');
    const endIndex = value.lastIndexOf('}');

    if (startIndex >= 0 && endIndex > startIndex) {
      const jsonString = value.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonString);
    }
  }
}

/**
 * Create a Component LLM client from environment variables
 * @returns A new LlmClient instance configured for component generation
 * @throws Error if required environment variables are not set
 */
export function createComponentLlmClient(): LlmClient {
  if (
    !process.env.MODEL_TO_EVAL ||
    !process.env.MODEL_TO_EVAL_PROVIDER ||
    !process.env.MODEL_TO_EVAL_API_KEY ||
    !process.env.MODEL_TO_EVAL_BASE_URL ||
    !process.env.MODEL_TO_EVAL_CLIENT_FEATURE_ID ||
    !process.env.MODEL_TO_EVAL_TENANT_ID
  ) {
    throw new Error(
      'MODEL_TO_EVAL, MODEL_TO_EVAL_PROVIDER, MODEL_TO_EVAL_API_KEY, MODEL_TO_EVAL_BASE_URL, MODEL_TO_EVAL_CLIENT_FEATURE_ID, and MODEL_TO_EVAL_TENANT_ID must be set'
    );
  }

  const modelConfig: ModelConfig = {
    model: process.env.MODEL_TO_EVAL,
    provider: process.env.MODEL_TO_EVAL_PROVIDER,
    apiKey: process.env.MODEL_TO_EVAL_API_KEY,
    baseUrl: process.env.MODEL_TO_EVAL_BASE_URL,
    clientFeatureID: process.env.MODEL_TO_EVAL_CLIENT_FEATURE_ID,
    tenantId: process.env.MODEL_TO_EVAL_TENANT_ID,
  };

  return new LlmClient(modelConfig);
}

/**
 * Create an evaluator LLM client from environment variables
 * @returns A new LlmClient instance configured for evaluation/judging
 * @throws Error if required environment variables are not set
 */
export function createEvaluatorLlmClient(): LlmClient {
  if (
    !process.env.JUDGE_MODEL ||
    !process.env.JUDGE_MODEL_PROVIDER ||
    !process.env.JUDGE_MODEL_API_KEY ||
    !process.env.JUDGE_MODEL_BASE_URL ||
    !process.env.JUDGE_MODEL_CLIENT_FEATURE_ID ||
    !process.env.JUDGE_MODEL_TENANT_ID
  ) {
    throw new Error(
      'JUDGE_MODEL, JUDGE_MODEL_PROVIDER, JUDGE_MODEL_API_KEY, JUDGE_MODEL_BASE_URL, JUDGE_MODEL_CLIENT_FEATURE_ID, and JUDGE_MODEL_TENANT_ID must be set'
    );
  }

  const modelConfig: ModelConfig = {
    model: process.env.JUDGE_MODEL,
    provider: process.env.JUDGE_MODEL_PROVIDER,
    apiKey: process.env.JUDGE_MODEL_API_KEY,
    baseUrl: process.env.JUDGE_MODEL_BASE_URL,
    clientFeatureID: process.env.JUDGE_MODEL_CLIENT_FEATURE_ID,
    tenantId: process.env.JUDGE_MODEL_TENANT_ID,
  };

  return new LlmClient(modelConfig);
}
