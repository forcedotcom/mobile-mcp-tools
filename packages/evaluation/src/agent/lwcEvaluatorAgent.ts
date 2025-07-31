/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod/v4';
import { LlmClient } from '../llmclient/llmClient.js';
import { formatComponent4LLM } from '../utils/lwcUtils.js';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server';
import { getJsonResponse } from '../utils/responseUtils.js';
import { Score, ScoreVerdict, ScoreVerdictEnum, ScoreCategorySchema } from '../schema/schema.js';

const withMetadata = <T extends z.ZodTypeAny>(schema: T, metadata: Record<string, unknown>) => {
  const extended = schema as T & { _metadata: Record<string, unknown> };
  extended._metadata = metadata;
  return extended;
};

// Response schema for LLM evaluation
const EvaluationResponseSchema = z.object({
  functionalRequirements: z.object({
    coreFunctionality: z.object({
      score: ScoreCategorySchema,
      matches: z.array(z.string()),
      mismatches: z.array(z.string()),
    }),
    errorHandling: z.object({
      score: ScoreCategorySchema,
      matches: z.array(z.string()),
      mismatches: z.array(z.string()),
    }),
  }),
  codeQuality: z.object({
    templateImplementation: z.object({
      score: ScoreCategorySchema,
      matches: z.array(z.string()),
      mismatches: z.array(z.string()),
    }),
    javascriptImplementation: z.object({
      score: ScoreCategorySchema,
      matches: z.array(z.string()),
      mismatches: z.array(z.string()),
    }),
    mobileCapabilities: z.object({
      score: ScoreCategorySchema,
      matches: z.array(z.string()),
      mismatches: z.array(z.string()),
    }),
  }),
  performanceAndSecurity: z.object({
    performance: z.object({
      score: ScoreCategorySchema,
      concerns: z.array(z.string()),
    }),
    security: z.object({
      score: ScoreCategorySchema,
      concerns: z.array(z.string()),
    }),
  }),
  userExperience: withMetadata(
    z.object({
      uiImplementation: z.object({
        score: ScoreCategorySchema,
        matches: z.array(z.string()),
        mismatches: z.array(z.string()),
      }),
    }),
    {
      weight: 0.1,
    }
  ),
  finalVerdict: ScoreVerdictEnum,
  justification: z.string().min(50),
});

export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;

const jsonSchema = z.toJSONSchema(EvaluationResponseSchema);

const CATEGORY_TO_PERCENTAGE = {
  Excellent: 1.0, // 100%
  Good: 0.8, // 80%
  Satisfactory: 0.6, // 60%
  Limited: 0.4, // 40%
  Poor: 0.2, // 20%
  Missing: 0.0, // 0%
} as const;

// Top-level category weights (must sum to 1.0)
const CATEGORY_WEIGHTS = {
  functionalRequirements: 0.4, // 40%
  codeQuality: 0.3, // 30%
  performanceAndSecurity: 0.2, // 20%
  userExperience: 0.1, // 10%
} as const;

// Sub-category weights within each category (must sum to 1.0)
const SUBCATEGORY_WEIGHTS = {
  functionalRequirements: {
    coreFunctionality: 0.5, // 50% of 40% = 20% of total
    errorHandling: 0.5, // 50% of 40% = 20% of total
  },
  codeQuality: {
    templateImplementation: 0.333, // 33.3% of 30% = 10% of total
    javascriptImplementation: 0.333, // 33.3% of 30% = 10% of total
    mobileCapabilities: 0.334, // 33.4% of 30% = 10% of total
  },
  performanceAndSecurity: {
    performance: 0.5, // 50% of 20% = 10% of total
    security: 0.5, // 50% of 20% = 10% of total
  },
  userExperience: {
    uiImplementation: 1.0, // 100% of 10% = 10% of total
  },
} as const;

// Exported for testing
export function calculateOverallScore(evaluation: EvaluationResponse): number {
  let totalScore = 0;
  // Functional Requirements (40%)
  const functionalScore =
    (CATEGORY_TO_PERCENTAGE[evaluation.functionalRequirements.coreFunctionality.score] *
      SUBCATEGORY_WEIGHTS.functionalRequirements.coreFunctionality +
      CATEGORY_TO_PERCENTAGE[evaluation.functionalRequirements.errorHandling.score] *
        SUBCATEGORY_WEIGHTS.functionalRequirements.errorHandling) *
    CATEGORY_WEIGHTS.functionalRequirements;

  // Code Quality (30%)
  const codeQualityScore =
    (CATEGORY_TO_PERCENTAGE[evaluation.codeQuality.templateImplementation.score] *
      SUBCATEGORY_WEIGHTS.codeQuality.templateImplementation +
      CATEGORY_TO_PERCENTAGE[evaluation.codeQuality.javascriptImplementation.score] *
        SUBCATEGORY_WEIGHTS.codeQuality.javascriptImplementation +
      CATEGORY_TO_PERCENTAGE[evaluation.codeQuality.mobileCapabilities.score] *
        SUBCATEGORY_WEIGHTS.codeQuality.mobileCapabilities) *
    CATEGORY_WEIGHTS.codeQuality;

  // Performance & Security (20%)
  const performanceSecurityScore =
    (CATEGORY_TO_PERCENTAGE[evaluation.performanceAndSecurity.performance.score] *
      SUBCATEGORY_WEIGHTS.performanceAndSecurity.performance +
      CATEGORY_TO_PERCENTAGE[evaluation.performanceAndSecurity.security.score] *
        SUBCATEGORY_WEIGHTS.performanceAndSecurity.security) *
    CATEGORY_WEIGHTS.performanceAndSecurity;

  // User Experience (10%)
  const userExperienceScore =
    CATEGORY_TO_PERCENTAGE[evaluation.userExperience.uiImplementation.score] *
    SUBCATEGORY_WEIGHTS.userExperience.uiImplementation *
    CATEGORY_WEIGHTS.userExperience;

  totalScore =
    (functionalScore + codeQualityScore + performanceSecurityScore + userExperienceScore) * 100;

  return Math.round(totalScore);
}

function determineVerdict(score: number): Score {
  let verdict: ScoreVerdict;
  if (score >= 85) verdict = 'Pass GA Criteria';
  else if (score >= 70) verdict = 'Pass Beta Criteria';
  else if (score >= 55) verdict = 'Pass Dev Preview Criteria';
  else verdict = 'FAIL';

  return {
    verdict,
    rawScore: score,
  };
}

/**
 * This class calls the LLM model to judge the development component against a reference component.
 */
export class LwcEvaluatorAgent {
  private readonly llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  async evaluate(referenceLWC: LwcCodeType, developmentLWC: LwcCodeType): Promise<Score> {
    const prompt = this.createLLMPrompt(referenceLWC, developmentLWC);
    const llmResponse = await this.llmClient.callLLM(prompt);
    const evaluationResponse = this.parseResponse(llmResponse);
    const overallScore = calculateOverallScore(evaluationResponse);
    const verdict = determineVerdict(overallScore);
    return verdict;
  }

  private parseResponse(llmResponse: string): EvaluationResponse {
    try {
      const jsonResponse = getJsonResponse(llmResponse);
      return EvaluationResponseSchema.parse(JSON.parse(jsonResponse));
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as valid evaluation data');
    }
  }

  /**
   * This method creates the prompt for the LLM model to judge the development component against a reference component.
   * @param referenceLWC - The reference LWC component.
   * @param resultLWC - The development LWC component.
   * @returns The prompt for the LLM model.
   */
  private createLLMPrompt(referenceLWC: LwcCodeType, resultLWC: LwcCodeType): string {
    const referenceLwcString = formatComponent4LLM(referenceLWC, 'referenceLWC');
    const developmentLwcString = formatComponent4LLM(resultLWC, 'developmentLWC');

    return `
# LWC Component Functionality Review

You are an expert Salesforce LWC (Lightning Web Component) code reviewer. Your task is to evaluate whether a development implementation fulfills the functionality of a reference implementation.

## Evaluation Categories
For each aspect of the implementation, provide one of these categorical scores:
- "Excellent": Perfect or near-perfect match in understanding and detail
- "Good": Strong understanding with minor differences
- "Satisfactory": Adequate understanding with some notable differences
- "Limited": Basic understanding with significant gaps
- "Poor": Major misunderstandings or omissions
- "Missing": Issue completely overlooked or fatally misunderstood

## Evaluation Guidelines

1. Functional Requirements:
   a) Core Functionality:
      - Required features implementation
      - Edge case handling
      - Mobile capabilities implementation
   
   b) Error Handling:
      - API error handling
      - Error message display and styling
      - Mobile capability error handling
      - Edge case handling

2. Code Quality:
   a) Template Implementation:
      - Template directives usage
      - Event binding syntax
      - DOM manipulation practices
   
   b) JavaScript Implementation:
      - Decorator usage
      - Error handling patterns
      - Reactive properties implementation
   
   c) Mobile Capabilities:
      - Initialization patterns
      - Availability checks
      - Error handling

3. Performance & Security:
   a) Performance:
      - Render optimization
      - Resource cleanup
      - Memory management
   
   b) Security:
      - Safe practices
      - Input sanitization
      - Error handling

4. User Experience:
   a) UI Implementation:
      - Layout and styling
      - Lightning Design System usage
      - Loading states

## Response Schema
Your response must be valid JSON conforming to this JSON Schema:

${JSON.stringify(jsonSchema, null, 2)}

## Reference Implementation:
${referenceLwcString}

## Development Implementation:
${developmentLwcString}
`;
  }
}

export default LwcEvaluatorAgent;
