/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { LlmClient } from '../llmclient/llmClient.js';
import {
  formatLwcCode4LLM,
  getLwcComponentFromLlmResponse,
  LWCFileType,
} from '../utils/lwcUtils.js';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server/schemas/lwcSchema';
import { CodeAnalysisIssuesType } from '@salesforce/mobile-web-mcp-server/schemas/analysisSchema';

/**
 * This class calls the LLM model to refactor an LWC component based on identified issues.
 */
export class LwcRefactorAgent {
  private readonly llmClient: LlmClient;

  constructor(llmClient: LlmClient) {
    this.llmClient = llmClient;
  }

  /**
   * Refactors an LWC component based on the provided issues
   * @param request The refactor request containing the component and issues
   * @returns The refactored component
   */
  async refactorComponent(
    lwcCode: LwcCodeType,
    issues: CodeAnalysisIssuesType
  ): Promise<LwcCodeType> {
    // Create the refactor prompt
    const prompt = this.createRefactorPrompt(lwcCode, issues);

    // Call the LLM to get the refactored component
    const llmResponse = await this.llmClient.callLLM(prompt);

    // Parse the response to get the refactored component
    const refactoredComponent = getLwcComponentFromLlmResponse(llmResponse);

    // only refactor the html, js, and css files, use original other field values
    const resultComponent = {
      name: lwcCode.name,
      namespace: lwcCode.namespace,
      html: refactoredComponent.html,
      js: refactoredComponent.js,
      css: refactoredComponent.css,
      jsMetaXml: lwcCode.jsMetaXml,
    };

    return resultComponent;
  }

  /**
   * Creates a prompt for the LLM to refactor the component
   */
  private createRefactorPrompt(component: LwcCodeType, issues: CodeAnalysisIssuesType): string {
    const componentCode = formatLwcCode4LLM(component);
    const issuesText = JSON.stringify(issues, null, 2);

    return `
# Lightning Web Component code to be refactored
${componentCode}

# The issues identified in the Lightning Web Component code. 
${issuesText}

# LWC Code Refactoring Assistant. 

You are an expert Salesforce developer specializing in Lightning Web Components (LWC). Your task is to refactor LWC code based on provided review feedback. 

## Input:
You have received:
1. The original LWC code (HTML, CSS, and JS files above)
2. The code review feedback from the most senior developers at Salesforce (YAML file above)

## Guidelines:
1. Apply all changes suggested in the code review feedback.
2. Maintain the original structure and intent of the component as much as possible.
3. Work within the scope of the identified issues, unless broader changes are necessary to address conflicting issues.
4. If an issue cannot be fully resolved without additional context, add a TODO comment in the code that best describes a possible solution and note any assumptions made.
5. Ensure that corrections in one file do not introduce new issues in another.
6. The refactored code should be production-ready and able to be tested as-is in a production environment.
7. If unsure about a particular correction, err on the side of caution and explain your reasoning in code comments this way the developer can figure what to do.

## Output:
Provide the refactored code for each file (HTML, CSS, and JS).
Present the full code for each file, even if parts are unchanged.
Each entry in html, js, and css arrays must be a full file as a single string.
Do not split by lines, each item represents a whole file.
Preserve all newlines and indentation inside each string, escaping newline characters as needed.

## Process:
1. Analyze the original code and review feedback
2. Identify areas for improvement based on the feedback
3. Refactor the code, addressing all identified issues while maintaining original functionality
4. Output the complete refactored code for all files

Remember to maintain the original functionality while addressing the issues. The goal is to produce a refined, production-ready component that addresses all identified issues.`;
  }
}

export default LwcRefactorAgent;
