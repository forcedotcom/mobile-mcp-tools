/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { LlmClient } from '../llmclient/llmClient.js';
import { CorrectnessScore, CorrectnessScoreSchema } from '../schema/schema.js';
import { createTwoFilesPatch } from 'diff';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server';
import { CodeAnalysisIssuesType } from '@salesforce/mobile-web-mcp-server/schemas/analysisSchema';
import { LWCFileType } from '../utils/lwcUtils.js';
import { z } from 'zod/v4';
import { getJsonResponse } from '../utils/responseUtils.js';

const jsonSchema = z.toJSONSchema(CorrectnessScoreSchema);

export class LwcRefactorCorrectnessEvaluatorAgent {
  private readonly llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  /**
   * Score the correctness of the refactored code based on the original code and the issue list
   * @param originalCode - The original LWC change before refactoring
   * @param issueList - List of issues identified that need to be addressed
   * @param refactoredCode - The refactored code to evaluate
   * @returns The correctness score of the refactored code
   */
  async scoreRefactorChanges(
    originalCode: LwcCodeType,
    issueList: CodeAnalysisIssuesType,
    refactoredCode: LwcCodeType
  ): Promise<CorrectnessScore> {
    const prompt = this.createLlmPrompt(originalCode, issueList, refactoredCode);
    const response = await this.llmClient.callLLM(prompt);
    const jsonResponse = getJsonResponse(response);
    const correctnessScore = CorrectnessScoreSchema.parse(JSON.parse(jsonResponse));
    return correctnessScore;
  }

  private computeFullDiff(
    originalCode: LwcCodeType,
    modifiedCode: LwcCodeType,
    language: LWCFileType
  ) {
    const originalCodeString = this.getLwcCodeText(originalCode, language);
    const modifiedCodeString = this.getLwcCodeText(modifiedCode, language);
    if (originalCodeString === modifiedCodeString) {
      return `No changes were made to the "${language}" code.`;
    }
    const diff = createTwoFilesPatch(
      `original.${language}`,
      `modified.${language}`,
      originalCodeString,
      modifiedCodeString,
      undefined,
      undefined,
      {
        context: Infinity,
        ignoreWhitespace: true,
        stripTrailingCr: true,
      }
    );
    return `\`\`\`diff\n${diff}\`\`\``;
  }

  private getLwcCodeText(code: LwcCodeType, language: LWCFileType): string {
    switch (language) {
      case LWCFileType.HTML:
        return code.html?.[0]?.content || '';
      case LWCFileType.JS:
        return code.js?.[0]?.content || '';
      case LWCFileType.CSS:
        return code.css?.[0]?.content || '';
      case LWCFileType.JS_META:
        return code.jsMetaXml?.content || '';
      default:
        return '';
    }
  }

  createLlmPrompt(
    originalCode: LwcCodeType,
    issueList: CodeAnalysisIssuesType,
    refactoredCode: LwcCodeType
  ): string {
    const htmlDiff = this.computeFullDiff(originalCode, refactoredCode, LWCFileType.HTML);
    const jsDiff = this.computeFullDiff(originalCode, refactoredCode, LWCFileType.JS);
    const cssDiff = this.computeFullDiff(originalCode, refactoredCode, LWCFileType.CSS);
    const issues = JSON.stringify(issueList, null, 2);

    return `
# LWC Code Change Evaluation

You are an expert Salesforce developer and code reviewer specializing in Lightning Web Components (LWC). 
Your task is to review the changes made by a developer to a LWC component and provide an overall score on the changes. 

The following is the evaluation criteria and guidelines:

## Evaluation Guidelines

1. For each identified issue:
    - Verify if it was properly addressed
    - Check if the solution is appropriate
    - Ensure the fix doesn't introduce new problems

2. Check for unauthorized changes:
    - Identify modifications not related to the issues
    - Flag changes that alter original functionality
    - Note any unnecessary refactoring

3. Evaluate implementation quality:
    - Proper LWC patterns and practices
    - Maintained component's original intent
    - Code clarity and maintainability

## Critical Evaluation Points

- Were all identified issues properly addressed?
- Were any changes made that weren't related to the issues?
- Did the changes maintain the component's intended functionality?
- Were any new problems introduced?

## Scoring Guidelines

Assign scores based on the following criteria:

### Score Categories:
- **"Excellent"** (90-100): Perfect or near-perfect match
  * All identified issues properly addressed
  * No unauthorized changes made
  * Maintains or improves code quality
  * Preserves original functionality

- **"Good"** (75-89): Strong understanding with minor differences
  * Most issues properly addressed
  * Minimal unauthorized changes
  * Generally maintains code quality
  * Minor oversights that don't impact functionality

- **"Satisfactory"** (60-74): Adequate understanding with some notable differences
  * Main issues addressed but with some oversights
  * Some unnecessary changes
  * Code quality mostly maintained
  * Some gaps in implementation

- **"Limited"** (40-59): Basic understanding with significant gaps
  * Several issues not properly addressed
  * Multiple unauthorized changes
  * Some degradation in code quality
  * Significant implementation gaps

- **"Poor"** (20-39): Major misunderstandings or omissions
  * Most issues not properly addressed
  * Many unauthorized or incorrect changes
  * Degraded code quality
  * Major implementation flaws

- **"Missing"** (0-19): Issue completely overlooked or fatally misunderstood
  * Failed to address critical issues
  * Made harmful changes
  * Broke existing functionality
  * Completely incorrect approach

### Verdict Mapping:
- **"Pass GA Criteria"**: Excellent or Good scores
- **"Pass Beta Criteria"**: Satisfactory scores
- **"Pass Dev Preview Criteria"**: Limited scores
- **"FAIL"**: Poor or Missing scores

## The following issues were identified that the developer should address:

${issues}

## Diff between the original code and the developer's modified code

### HTML

${htmlDiff}

### JS

${jsDiff}

### CSS

${cssDiff}

## Task

Evaluate how well the developer addressed the specific issues while maintaining code quality and component functionality.

## Response Schema
Your response must be valid JSON conforming to this JSON Schema:

${JSON.stringify(jsonSchema, null, 2)}
`;
  }
}
