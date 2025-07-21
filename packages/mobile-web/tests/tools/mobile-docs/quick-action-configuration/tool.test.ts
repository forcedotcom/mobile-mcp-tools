/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuickActionConfigurationTool } from '../../../../src/tools/mobile-docs/quick-action-configuration/tool.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('QuickActionConfigurationTool', () => {
  let tool: QuickActionConfigurationTool;
  let server: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    tool = new QuickActionConfigurationTool();
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    vi.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct tool properties', () => {
      expect(tool.name).toBe('Mobile Quick Action Configuration');
      expect(tool.description).toContain(
        'detailed guidance and examples for configuring Salesforce Quick Actions'
      );
      expect(tool.description).toContain('mobile apps');
      expect(tool.toolId).toBe('sfmobile-docs-quick-action-configuration');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should have a meaningful description', () => {
      expect(tool.description).toContain('Quick Actions with Lightning Web Components');
      expect(tool.description).toContain('metadata templates');
      expect(tool.description).toContain('mobile-specific considerations');
    });

    it('should require no input', () => {
      const inputShape = tool.inputSchema.shape;
      expect(Object.keys(inputShape)).toHaveLength(0);
    });
  });

  describe('Tool Registration', () => {
    it('should register the tool without throwing', () => {
      const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation(() => {
        return {} as never;
      });

      expect(() => tool.register(server, annotations)).not.toThrow();
      expect(registerToolSpy).toHaveBeenCalledWith(
        'sfmobile-docs-quick-action-configuration',
        expect.objectContaining({
          description: tool.description,
          inputSchema: tool.inputSchema.shape,
          annotations: annotations,
        }),
        expect.any(Function)
      );
    });

    it('should register with correct tool ID', () => {
      const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation(() => {
        return {} as never;
      });

      tool.register(server, annotations);

      expect(registerToolSpy).toHaveBeenCalledWith(
        'sfmobile-docs-quick-action-configuration',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Quick Action Configuration Content', () => {
    // Helper to access private method
    const getContent = () => {
      // Access the private method using bracket notation for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (tool as any).getQuickActionConfigurationContent() as string;
    };

    it('should return quick action configuration content', () => {
      const content = getContent();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include overview section', () => {
      const content = getContent();
      expect(content).toContain('## Overview');
      expect(content).toContain('Quick Actions provide a streamlined way');
      expect(content).toContain('Salesforce Mobile App and Field Service Mobile App');
    });

    it('should include quick action setup guidance', () => {
      const content = getContent();
      expect(content).toContain('Quick Action Setup Process');
      expect(content).toContain('**global quick action** or **record-specific quick action**');
      expect(content).toContain('force-app/main/default/quickActions');
    });

    it('should include record-specific quick action example', () => {
      const content = getContent();
      expect(content).toContain('Record-Specific Quick Action');
      expect(content).toContain('Account.CreateAccount.quickAction-meta.xml');
      expect(content).toContain('<actionSubtype>ScreenAction</actionSubtype>');
      expect(content).toContain('<lightningWebComponent>createaccount</lightningWebComponent>');
      expect(content).toContain('<type>LightningWebComponent</type>');
    });

    it('should include global quick action example', () => {
      const content = getContent();
      expect(content).toContain('Global Quick Action');
      expect(content).toContain('CreateAccount.quickAction-meta.xml');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<label>Create an Account</label>');
    });

    it('should include key points for each action type', () => {
      const content = getContent();
      expect(content).toContain('Key Points for Record-Specific Actions');
      expect(content).toContain(
        'File naming pattern: {ObjectName}.{ActionName}.quickAction-meta.xml'
      );
      expect(content).toContain('Key Points for Global Actions');
      expect(content).toContain('File naming pattern: {ActionName}.quickAction-meta.xml');
    });

    it('should include simplified metadata guidance', () => {
      const content = getContent();
      expect(content).toContain('Quick Action Metadata Guidance');
      expect(content).toContain('Use the provided metadata examples as a guide');
      expect(content).toContain('DO NOT add any additional elements');
    });

    it('should include mobile-specific considerations', () => {
      const content = getContent();
      expect(content).toContain('Mobile-Specific Considerations');
      expect(content).toContain('Touch-Friendly Design');
      expect(content).toContain('Performance Optimization');
      expect(content).toContain('Screen Size Adaptation');
      expect(content).toContain('Navigation Patterns');
    });

    it('should not include removed sections', () => {
      const content = getContent();
      // These sections should no longer be present
      expect(content).not.toContain('LWC Component Considerations');
      expect(content).not.toContain('CloseActionScreenEvent');
      expect(content).not.toContain('Deployment and Testing');
      expect(content).not.toContain('Additional Resources');
      expect(content).not.toContain('Required Elements');
      expect(content).not.toContain('Optional Elements');
    });
  });

  describe('Error Handling', () => {
    it('should have error handling in the registration handler', () => {
      const registerToolSpy = vi.spyOn(server, 'registerTool').mockImplementation(() => {
        return {} as never;
      });

      // Test that tool registration doesn't throw
      expect(() => tool.register(server, annotations)).not.toThrow();
      expect(registerToolSpy).toHaveBeenCalled();
    });
  });
});
