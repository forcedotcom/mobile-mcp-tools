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

import { MobileWebMcpClient } from '../mcpclient/mobileWebMcpClient.js';
import { LWCComponent } from '../utils/lwcUtils.js';
import { 
    ExpertsCodeAnalysisIssuesType, 
    ExpertsCodeAnalysisIssuesSchema, 
    ExpertsReviewInstructionsType
} from '@salesforce/mobile-web-mcp-server/schemas/analysisSchema';

interface LwcFile {
  path: string;
  content: string;
}

interface LwcCodeType {
  name: string;
  namespace: string;
  html: LwcFile[];
  js: LwcFile[];
  css: LwcFile[];
  jsMetaXml: LwcFile;
}

/**
 * This class reviews LWC components using mobile-web offline analysis and guidance tools
 * to identify mobile-specific issues and provide recommendations.
 */
export class LwcReviewAgent {
  private readonly mcpClient: MobileWebMcpClient;

  constructor(mcpClient: MobileWebMcpClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Reviews an LWC component using mobile-web offline analysis and guidance tools
   * @param component - The LWC component to review
   * @returns Promise containing the analysis results with found issues
   */
  async reviewLwcComponent(component: LWCComponent): Promise<ExpertsCodeAnalysisIssuesType> {
    try {
      // Convert LWC component to the format expected by mobile-web tools
      const lwcCode = this.convertToLwcCodeType(component);

      // Get offline guidance instructions
      const guidanceResult = await this.mcpClient.callTool('sfmobile-web-offline-guidance', {});
      const guidanceInstructions = guidanceResult.content[0]?.text;
      
      if (!guidanceInstructions) {
        throw new Error('Failed to get guidance instructions from mobile-web offline-guidance tool');
      }

      // Parse guidance instructions
      const guidanceData: ExpertsReviewInstructionsType = JSON.parse(guidanceInstructions);

      // Run offline analysis
      const analysisResult = await this.mcpClient.callTool('sfmobile-web-offline-analysis', lwcCode as unknown as Record<string, unknown>);
      const analysisContent = analysisResult.content[0]?.text;
      
      if (!analysisContent) {
        throw new Error('Failed to get analysis results from mobile-web offline-analysis tool');
      }

      // Parse analysis results
      const analysisData = ExpertsCodeAnalysisIssuesSchema.parse(JSON.parse(analysisContent));
      return analysisData;
    } catch (error) {
      console.error('Error reviewing LWC component:', error);
      throw error;
    }
  }

  /**
   * Converts LWCComponent to LwcCodeType format expected by mobile-web tools
   * @param component - The LWC component to convert
   * @returns LwcCodeType format
   */
  private convertToLwcCodeType(component: LWCComponent): LwcCodeType {
    const html: Array<{ path: string; content: string }> = [];
    const js: Array<{ path: string; content: string }> = [];
    const css: Array<{ path: string; content: string }> = [];
    let jsMetaXml: { path: string; content: string } | undefined;

    // Extract component name from files
    let componentName = 'component';
    let namespace = 'c';

    for (const file of component.files) {
      const filePath = `${file.name}.${file.type}`;
      
      switch (file.type) {
        case 'html':
          html.push({ path: filePath, content: file.content });
          if (!componentName || componentName === 'component') {
            componentName = file.name;
          }
          break;
        case 'js':
          js.push({ path: filePath, content: file.content });
          if (!componentName || componentName === 'component') {
            componentName = file.name;
          }
          break;
        case 'css':
          css.push({ path: filePath, content: file.content });
          break;
        case 'js-meta.xml':
          jsMetaXml = { path: filePath, content: file.content };
          // Extract namespace from meta XML if available
          const namespaceMatch = file.content.match(/<targetConfigs>\s*<targetConfig targets="lightning__AppPage">\s*<property name="namespace" value="([^"]+)"/);
          if (namespaceMatch) {
            namespace = namespaceMatch[1];
          }
          break;
      }
    }

    if (!jsMetaXml) {
      throw new Error('LWC component must include a js-meta.xml file');
    }

    return {
      name: componentName,
      namespace,
      html,
      js,
      css,
      jsMetaXml,
    };
  }
}

export default LwcReviewAgent;

