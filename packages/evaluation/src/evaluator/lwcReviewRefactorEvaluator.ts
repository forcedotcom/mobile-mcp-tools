/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { CorrectnessScore } from '../schema/schema.js';
import LwcRefactorAgent from '../agent/lwcRefactorAgent.js';
import { LwcReviewAgent } from '../agent/lwcReviewAgent.js';
import { LwcRefactorCorrectnessEvaluatorAgent as LwcRefactorCorrectnessEvaluatorAgent } from '../agent/lwcRefactorCorrectnessEvaluatorAgent.js';
import { LlmClient } from '../llmclient/llmClient.js';
import { MobileWebMcpClient } from '../mcpclient/mobileWebMcpClient.js';
import { EvaluationUnit } from '../utils/lwcUtils.js';
import { BaseEvaluator } from './baseEvaluator.js';

export class LwcReviewRefactorEvaluator extends BaseEvaluator {
  private readonly reviewAgent: LwcReviewAgent;
  private readonly refactorAgent: LwcRefactorAgent;
  private readonly correctnessEvaluatorAgent: LwcRefactorCorrectnessEvaluatorAgent;

  constructor(
    evaluatorLlmClient: LlmClient,
    componentLlmClient: LlmClient,
    mcpClient: MobileWebMcpClient
  ) {
    super();
    this.reviewAgent = new LwcReviewAgent(mcpClient, componentLlmClient);
    this.refactorAgent = new LwcRefactorAgent(componentLlmClient);
    this.correctnessEvaluatorAgent = new LwcRefactorCorrectnessEvaluatorAgent(evaluatorLlmClient);
  }

  async evaluate(evaluationUnit: EvaluationUnit): Promise<CorrectnessScore> {
    const originalComponent = evaluationUnit.component;

    const issues = await this.reviewAgent.reviewLwcComponent(originalComponent);

    const refactoredComponent = await this.refactorAgent.refactorComponent(
      originalComponent,
      issues
    );

    const score = await this.correctnessEvaluatorAgent.scoreRefactorChanges(
      originalComponent,
      issues,
      refactoredComponent
    );

    return score;
  }

  async destroy(): Promise<void> {
    // No resources to dispose
  }
}
