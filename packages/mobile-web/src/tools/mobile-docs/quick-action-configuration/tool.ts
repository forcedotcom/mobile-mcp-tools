/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { Tool } from '../../tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import dedent from 'dedent';

const EMPTY_INPUT_SCHEMA = z.object({}).describe('No input required');

export class QuickActionConfigurationTool implements Tool {
  readonly name = 'Mobile Quick Action Configuration';
  readonly description =
    'Provides detailed guidance and examples for configuring Salesforce Quick Actions with Lightning Web Components for mobile apps. Includes metadata templates for both global and record-specific quick actions, setup instructions, and mobile-specific considerations.';
  readonly toolId = 'sfmobile-docs-quick-action-configuration';
  readonly inputSchema = EMPTY_INPUT_SCHEMA;

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.registerTool(
      this.toolId,
      {
        description: this.description,
        inputSchema: this.inputSchema.shape,
        annotations: annotations,
      },
      async () => {
        try {
          const quickActionContent = this.getQuickActionConfigurationContent();

          return {
            content: [
              {
                type: 'text',
                text: quickActionContent,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to generate quick action configuration content: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }
      }
    );
  }

  private getQuickActionConfigurationContent(): string {
    return dedent`
      # Mobile Quick Action Configuration for LWC Components

      ## Overview

      When creating Lightning Web Components for mobile apps, Quick Actions provide a streamlined way to present your components in the Salesforce Mobile App and Field Service Mobile App. This guide covers how to properly configure Quick Action metadata for mobile LWC components.

      ## Quick Action Setup Process

      When a user is creating a new LWC component for mobile, ask them if they wish to set up the component as a quick action. If so, make sure you know if the quick action is meant to be configured as a **global quick action** or **record-specific quick action**. Ask for clarification if it's not specified. 

      Once you have a comprehensive understanding, go ahead and set up the quick action metadata for the user. Quick action metadata should go under force-app/main/default/quickActions.

      ## Quick Action Types and Examples

      ### Record-Specific Quick Action

      Record-specific quick actions appear on specific object record pages and have access to the record context.

      **File:** Account.CreateAccount.quickAction-meta.xml
      \`\`\`xml
      <QuickAction xmlns="http://soap.sforce.com/2006/04/metadata">
          <actionSubtype>ScreenAction</actionSubtype>
          <label>CreateRecordAction</label>
          <lightningWebComponent>createaccount</lightningWebComponent>
          <optionsCreateFeedItem>false</optionsCreateFeedItem>
          <type>LightningWebComponent</type>
      </QuickAction>
      \`\`\`

      **Key Points for Record-Specific Actions:**
      - File naming pattern: {ObjectName}.{ActionName}.quickAction-meta.xml
      - Automatically receives record context in the LWC
      - Appears in the object's action menu
      - Best for actions that need to operate on or relate to a specific record

      ### Global Quick Action

      Global quick actions are available from anywhere in the app and don't have automatic record context.

      **File:** CreateAccount.quickAction-meta.xml
      \`\`\`xml
      <?xml version="1.0" encoding="UTF-8"?>
      <QuickAction xmlns="http://soap.sforce.com/2006/04/metadata">
          <actionSubtype>ScreenAction</actionSubtype>
          <label>Create an Account</label>
          <lightningWebComponent>createaccount</lightningWebComponent>
          <optionsCreateFeedItem>false</optionsCreateFeedItem>
          <type>LightningWebComponent</type>
      </QuickAction>
      \`\`\`

      **Key Points for Global Actions:**
      - File naming pattern: {ActionName}.quickAction-meta.xml
      - Available from global action menu and home page
      - No automatic record context
      - Best for standalone actions or creating new records

      ## Quick Action Metadata Guidance

      - Use the provided metadata examples as a guide, DO NOT add any additional elements.
    `;
  }
}
