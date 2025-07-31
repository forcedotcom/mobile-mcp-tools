/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * LwcReviewAgent - Reviews LWC components using mobile-web offline analysis and guidance tools
 *
 * Usage Example:
 * ```typescript
 * import { LwcReviewAgent } from './lwcReviewAgent.js';
 * import { MobileWebMcpClient } from '../mcpclient/mobileWebMcpClient.js';
 * import { LWCComponent } from '../utils/lwcUtils.js';
 *
 * // Create an LWC component to review
 * const component: LWCComponent = {
 *   files: [
 *     {
 *       name: 'myComponent',
 *       type: 'html',
 *       content: '<template><div>Hello World</div></template>',
 *     },
 *     {
 *       name: 'myComponent',
 *       type: 'js',
 *       content: 'export default class MyComponent extends LightningElement {}',
 *     },
 *     {
 *       name: 'myComponent',
 *       type: 'js-meta.xml',
 *       content: '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle>...</LightningComponentBundle>',
 *     },
 *   ],
 * };
 *
 * // Create and use the review agent
 * const mcpClient = new MobileWebMcpClient();
 * const reviewAgent = new LwcReviewAgent(mcpClient);
 *
 * try {
 *   const analysisResults = await reviewAgent.reviewLwcComponent(component);
 *   console.log('Found issues:', analysisResults.analysisResults);
 * } catch (error) {
 *   console.error('Review failed:', error);
 * }
 * ```
 */

import { z } from 'zod';
import { LlmClient } from '../llmclient/llmClient.js';
import { MobileWebMcpClient } from '../mcpclient/mobileWebMcpClient.js';
import { formatLwcCode4LLM, LWCComponent, convertToLwcCodeType } from '../utils/lwcUtils.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  ExpertsCodeAnalysisIssuesSchema,
  ExpertsReviewInstructionsType,
  CodeAnalysisIssuesType,
  CodeAnalysisIssuesSchema,
} from '@salesforce/mobile-web-mcp-server/schemas/analysisSchema';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server/schemas/lwcSchema';
import { getJsonResponse } from '../utils/responseUtils.js';

const jsonSchema = zodToJsonSchema(CodeAnalysisIssuesSchema);

/**
 * This class reviews LWC components using mobile-web offline analysis and guidance tools
 * to identify mobile-specific issues and provide recommendations.
 */
export class LwcReviewAgent {
  private readonly mcpClient: MobileWebMcpClient;
  private readonly llmClient: LlmClient;

  constructor(mcpClient: MobileWebMcpClient, llmClient: LlmClient) {
    this.mcpClient = mcpClient;
    this.llmClient = llmClient;
  }

  /**
   * Reviews an LWC component using mobile-web offline analysis and guidance tools
   * @param component - The LWC component to review
   * @returns Promise containing the analysis results with found issues
   */
  async reviewLwcComponent(lwcCode: LwcCodeType): Promise<CodeAnalysisIssuesType> {
    try {
      const issues = await this.reviewBasedOnOfflineGuidance(lwcCode);

      // Run offline analysis
      const analysisResult = await this.mcpClient.callTool(
        'sfmobile-web-offline-analysis',
        lwcCode as unknown as Record<string, unknown>
      );
      const analysisContent = analysisResult.content[0]?.text;

      if (!analysisContent) {
        throw new Error('Failed to get analysis results from mobile-web offline-analysis tool');
      }

      // Parse analysis results
      const analysisData = ExpertsCodeAnalysisIssuesSchema.parse(JSON.parse(analysisContent));

      analysisData.analysisResults.forEach(result => {
        issues.push(...result.issues);
      });
      return issues;
    } catch (error) {
      console.error('Error reviewing LWC component:', error);
      throw error;
    }
  }

  private generatePrompt(
    guidanceData: ExpertsReviewInstructionsType,
    component: LwcCodeType
  ): string {
    return `
    # LWC Component Functionality Review
    You are an expert Salesforce LWC (Lightning Web Component) code reviewer.
    You are given a LWC component and a set of guidance instructions.
    You need to review the component based on the guidance instructions and return a list of issues.

    ## Review Guidance Instructions
    ${guidanceData.reviewInstructions.map(instruction => `- ${instruction.request}`).join('\n')}

    ## Component to Review
    ${formatLwcCode4LLM(component)}

    ## Response Schema
    Your response must be valid JSON conforming to this JSON Schema:

    ${JSON.stringify(jsonSchema, null, 2)}
    `;
  }

  /**
   * Review the component based on the offline guidance instructions.
   * It retrieves the guidance instructions from the mobile-web offline-guidance tool.
   * It then generates a prompt for the LLM to review the component based on the guidance instructions.
   * It then calls the LLM to review the component.
   * It then parses the review result and returns the issues.
   * @param component - The LWC component to review
   * @returns Promise containing the analysis results with found issues
   */
  private async reviewBasedOnOfflineGuidance(
    component: LwcCodeType
  ): Promise<CodeAnalysisIssuesType> {
    // Get offline guidance instructions
    const guidanceResult = await this.mcpClient.callTool('sfmobile-web-offline-guidance', {});
    const guidanceInstructions = guidanceResult.content[0]?.text;

    if (!guidanceInstructions) {
      throw new Error('Failed to get guidance instructions from mobile-web offline-guidance tool');
    }

    // Parse guidance instructions
    const guidanceData: ExpertsReviewInstructionsType = JSON.parse(guidanceInstructions);

    //Generate a prompt for the LLM to review the component based on the guidance instructions
    const prompt = this.generatePrompt(guidanceData, component);

    //Call the LLM to review the component
    const response = await this.llmClient.callLLM(prompt);
    const jsonResponse = getJsonResponse(response);

    //Parse the review result
    const issues = CodeAnalysisIssuesSchema.parse(JSON.parse(jsonResponse));
    return issues;
  }
}

export default LwcReviewAgent;
