/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SFMobileNativeTemplateDiscoveryTool } from '../../../../src/tools/plan/sfmobile-native-template-discovery/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('SFMobileNativeTemplateDiscoveryTool', () => {
  let tool: SFMobileNativeTemplateDiscoveryTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new SFMobileNativeTemplateDiscoveryTool(mockServer);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.toolMetadata.toolId).toBe('sfmobile-native-template-discovery');
      expect(tool.toolMetadata.title).toBe('Salesforce Mobile Native Template Discovery');
      expect(tool.toolMetadata.description).toBe(
        'Guides LLM through template discovery and selection for Salesforce mobile app development'
      );
      expect(tool.toolMetadata.inputSchema).toBeDefined();
    });

    it('should register without throwing errors', () => {
      expect(() => tool.register(annotations)).not.toThrow();
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept platform parameter', () => {
      const validInput = { platform: 'iOS', workflowStateData: { thread_id: 'test-123' } };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept workflow state data', () => {
      const validInput = {
        platform: 'Android' as const,
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform values', () => {
      const invalidInput = { platform: 'Windows' };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Template Discovery Guidance', () => {
    it('should generate guidance for iOS platform', async () => {
      const input = {
        platform: 'iOS' as const,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Template Discovery Guidance for iOS');
      expect(response.promptForLLM).toContain('Step 1: Template Discovery');
      expect(response.promptForLLM).toContain('Step 2: Detailed Template Investigation');
      expect(response.promptForLLM).toContain('sf mobilesdk ios listtemplates');
      expect(response.promptForLLM).toContain('sf mobilesdk ios describetemplate');
    });

    it('should generate guidance for Android platform', async () => {
      const input = {
        platform: 'Android' as const,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Template Discovery Guidance for Android');
      expect(response.promptForLLM).toContain('sf mobilesdk android listtemplates');
      expect(response.promptForLLM).toContain('sf mobilesdk android describetemplate');
    });

    it('should include template source path', async () => {
      const input = {
        platform: 'iOS' as const,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('--templatesource=');
      expect(response.promptForLLM).toContain('--template=<TEMPLATE_PATH>');
    });

    it('should include next steps guidance', async () => {
      const input = {
        platform: 'iOS' as const,
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Post-Tool-Invocation Instructions');
      expect(response.promptForLLM).toContain('sfmobile-native-project-manager');
    });
  });
});
