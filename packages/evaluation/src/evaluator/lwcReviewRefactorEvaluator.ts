/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Score } from '../agent/lwcEvaluatorAgent.js';
import { LwcReviewAgent } from '../agent/lwcReviewAgent.js';
import { LlmClient } from '../llmclient/llmClient.js';
import { MobileWebMcpClient } from '../mcpclient/mobileWebMcpClient.js';
import { EvaluationUnit } from '../utils/lwcUtils.js';
import { BaseEvaluator } from './baseEvaluator.js';

export class LwcReviewRefactorEvaluator extends BaseEvaluator {
  private readonly reviewRefactorAgent: LwcReviewAgent;

  constructor(
    evaluatorLlmClient: LlmClient,
    componentLlmClient: LlmClient,
    mcpClient: MobileWebMcpClient
  ) {
    super();
    this.reviewRefactorAgent = new LwcReviewAgent(mcpClient);
  }

  async evaluate(evaluationUnit: EvaluationUnit): Promise<Score> {
    const reviewResult = await this.reviewRefactorAgent.reviewLwcComponent(evaluationUnit.component);

    

    return {
      verdict: 'Pass GA Criteria',
      rawScore: 0.8,
    };
  }

  async destroy(): Promise<void> {
    // No resources to dispose
  }
}
