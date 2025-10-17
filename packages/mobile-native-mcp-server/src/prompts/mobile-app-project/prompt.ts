/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { AbstractPrompt } from '../base/abstractPrompt.js';
import { PLATFORM_ENUM } from '../../common/schemas.js';
import {
  MOBILE_APP_PROJECT_PROMPT_NAME,
  MOBILE_APP_PROJECT_PROMPT_DESCRIPTION,
  type MobileAppProjectPromptArguments,
} from './metadata.js';

/**
 * MCP Prompt for launching the Magen mobile app generation workflow
 */
export class MobileAppProjectPrompt extends AbstractPrompt {
  constructor(server: McpServer) {
    super(server);
  }

  /**
   * Register the mobile_app_project prompt with the MCP server
   */
  public register(): void {
    this.server.prompt(
      MOBILE_APP_PROJECT_PROMPT_NAME,
      MOBILE_APP_PROJECT_PROMPT_DESCRIPTION,
      {
        platform: PLATFORM_ENUM,
      },
      async (args: MobileAppProjectPromptArguments) => {
        return this.generatePromptResponse(args);
      }
    );
  }

  /**
   * Generate the prompt message for the mobile app project workflow
   */
  private generatePromptResponse(args: MobileAppProjectPromptArguments): GetPromptResult {
    const { platform } = args;

    return {
      description: MOBILE_APP_PROJECT_PROMPT_DESCRIPTION,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I want to create a new ${platform} mobile application project using the Magen framework. Please help me get started with the mobile app generation workflow.`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `I'll help you create a new ${platform} mobile application using the Magen framework. Let me initiate the mobile app generation workflow.

To get started, I'll use the sfmobile_native_project_manager tool to orchestrate the project creation process. This workflow will:

1. Analyze your requirements and help gather any additional information needed
2. Discover and select the appropriate ${platform} template
3. Generate your project structure
4. Set up the build configuration
5. Prepare the project for deployment

Let me invoke the orchestrator to begin the workflow. What kind of mobile application would you like to build?`,
          },
        },
      ],
    };
  }
}
