/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { CorrectnessScore } from '../schema/schema.js';
import LwcRefactorAgent from '../agent/lwcRefactorAgent.js';
import { LwcReviewAgent } from '../agent/lwcReviewAgent.js';
import { LwdRefactorCorrectnessEvaluatorAgent as LwcRefactorCorrectnessEvaluatorAgent } from '../agent/lwdRefactorCorrectnessEvaluatorAgent.js';
import { LlmClient } from '../llmclient/llmClient.js';
import { MobileWebMcpClient } from '../mcpclient/mobileWebMcpClient.js';
import { convertToLwcCodeType, EvaluationUnit } from '../utils/lwcUtils.js';
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
    const originalLwcCode = convertToLwcCodeType(evaluationUnit.component);

    const issues = await this.reviewAgent.reviewLwcComponent(originalLwcCode);

    const refactoredLwcCode = await this.refactorAgent.refactorComponent(originalLwcCode, issues);

    const refactorCorrectorResult = await this.correctnessEvaluatorAgent.scoreRefactorChanges(
      originalLwcCode,
      issues,
      refactoredLwcCode
    );

    return refactorCorrectorResult;
  }

  async destroy(): Promise<void> {
    // No resources to dispose
  }
}
