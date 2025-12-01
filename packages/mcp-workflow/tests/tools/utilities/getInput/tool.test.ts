/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetInputTool } from '../../../../src/tools/utilities/getInput/tool.js';
import { createGetInputTool } from '../../../../src/tools/utilities/getInput/factory.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

describe('GetInputTool', () => {
  const TEST_TOOL_ID = 'test-get-input';
  const TEST_ORCHESTRATOR_ID = 'test-orchestrator';

  let tool: GetInputTool;
  let mockServer: McpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    tool = new GetInputTool(mockServer, TEST_TOOL_ID, TEST_ORCHESTRATOR_ID);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata with provided toolId', () => {
      expect(tool.toolMetadata.toolId).toBe(TEST_TOOL_ID);
      expect(tool.toolMetadata.title).toBe('Get User Input');
      expect(tool.toolMetadata.description).toBe(
        'Provides a prompt to the user to elicit their input for a set of properties'
      );
      expect(tool.toolMetadata.inputSchema).toBeDefined();
      expect(tool.toolMetadata.outputSchema).toBeDefined();
      expect(tool.toolMetadata.resultSchema).toBeDefined();
    });

    it('should allow different tool IDs', () => {
      const tool1 = new GetInputTool(mockServer, 'custom-get-input-1', TEST_ORCHESTRATOR_ID);
      const tool2 = new GetInputTool(mockServer, 'custom-get-input-2', TEST_ORCHESTRATOR_ID);
      const tool3 = new GetInputTool(mockServer, 'mobile-magen-get-input', TEST_ORCHESTRATOR_ID);

      expect(tool1.toolMetadata.toolId).toBe('custom-get-input-1');
      expect(tool2.toolMetadata.toolId).toBe('custom-get-input-2');
      expect(tool3.toolMetadata.toolId).toBe('mobile-magen-get-input');
    });

    it('should register without throwing errors', () => {
      expect(() => tool.register(annotations)).not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should create tool with specified toolId', () => {
      const factoryTool = createGetInputTool(mockServer, {
        toolId: 'magen-get-input',
        orchestratorToolId: TEST_ORCHESTRATOR_ID,
      });

      expect(factoryTool.toolMetadata.toolId).toBe('magen-get-input');
    });

    it('should create tool with custom toolId', () => {
      const factoryTool = createGetInputTool(mockServer, {
        toolId: 'mobile-magen-get-input',
        orchestratorToolId: TEST_ORCHESTRATOR_ID,
      });

      expect(factoryTool.toolMetadata.toolId).toBe('mobile-magen-get-input');
    });

    it('should create tool with different toolIds', () => {
      const mobileTool = createGetInputTool(mockServer, {
        toolId: 'mobile-magen-get-input',
        orchestratorToolId: 'mobile-orchestrator',
      });

      const salesopsTool = createGetInputTool(mockServer, {
        toolId: 'salesops-magen-get-input',
        orchestratorToolId: 'salesops-orchestrator',
      });

      expect(mobileTool.toolMetadata.toolId).toBe('mobile-magen-get-input');
      expect(salesopsTool.toolMetadata.toolId).toBe('salesops-magen-get-input');
    });

    it('should create functional tool via factory', async () => {
      const factoryTool = createGetInputTool(mockServer, {
        toolId: 'test-magen-get-input',
        orchestratorToolId: TEST_ORCHESTRATOR_ID,
      });

      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await factoryTool.handleRequest(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('Input Schema Validation', () => {
    it('should accept valid input with all required fields', () => {
      const validInput = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform (iOS or Android)',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept multiple properties', () => {
      const validInput = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform (iOS or Android)',
          },
          {
            propertyName: 'projectName',
            friendlyName: 'project name',
            description: 'Name of the mobile application project',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept workflow state data', () => {
      const validInput = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test property',
            description: 'test description',
          },
        ],
        workflowStateData: { thread_id: 'test-456', custom: 'data' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty properties array', () => {
      const validInput = {
        propertiesRequiringInput: [],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject input missing propertiesRequiringInput', () => {
      const invalidInput = {
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input missing workflowStateData', () => {
      const invalidInput = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test',
            description: 'test',
          },
        ],
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject property without propertyName', () => {
      const invalidInput = {
        propertiesRequiringInput: [
          {
            friendlyName: 'test',
            description: 'test',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject property without friendlyName', () => {
      const invalidInput = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            description: 'test',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject property without description', () => {
      const invalidInput = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };
      const result = tool.toolMetadata.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('Output Schema Validation', () => {
    it('should validate correct output structure', () => {
      const validOutput = {
        promptForLLM: 'some prompt text',
        resultSchema: '{"type": "object"}',
      };
      const result = tool.toolMetadata.outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject output missing promptForLLM', () => {
      const invalidOutput = {
        resultSchema: '{"type": "object"}',
      };
      const result = tool.toolMetadata.outputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject output missing resultSchema', () => {
      const invalidOutput = {
        promptForLLM: 'some prompt text',
      };
      const result = tool.toolMetadata.outputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('Result Schema Validation', () => {
    it('should validate result with string user utterance', () => {
      const validResult = {
        userUtterance: 'iOS',
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with numeric user utterance', () => {
      const validResult = {
        userUtterance: 42,
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with object user utterance', () => {
      const validResult = {
        userUtterance: { platform: 'iOS', version: '1.0' },
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should validate result with null user utterance', () => {
      const validResult = {
        userUtterance: null,
      };
      const result = tool.toolMetadata.resultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });

  describe('Prompt Generation Guidance', () => {
    it('should generate guidance with properties', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform (iOS or Android)',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('platform');
      expect(response.promptForLLM).toContain('mobile platform');
    });

    it('should include ROLE section', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test property',
            description: 'test description',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('# ROLE');
      expect(response.promptForLLM).toContain('input gathering tool');
    });

    it('should include TASK section', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test property',
            description: 'test description',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('# TASK');
      expect(response.promptForLLM).toContain('provide a prompt to the user');
    });

    it('should include CONTEXT section with properties', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'projectName',
            friendlyName: 'project name',
            description: 'The name of your mobile application project',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('# CONTEXT');
      expect(response.promptForLLM).toContain('Property Name: projectName');
      expect(response.promptForLLM).toContain('Friendly Name: project name');
      expect(response.promptForLLM).toContain(
        'Description: The name of your mobile application project'
      );
    });

    it('should include INSTRUCTIONS section', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test property',
            description: 'test description',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('# INSTRUCTIONS');
      expect(response.promptForLLM).toContain('generate a prompt');
      expect(response.promptForLLM).toContain('Post-Tool-Invocation');
    });

    it('should handle multiple properties in context', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform (iOS or Android)',
          },
          {
            propertyName: 'projectName',
            friendlyName: 'project name',
            description: 'Name of the mobile application project',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('Property Name: platform');
      expect(response.promptForLLM).toContain('Property Name: projectName');
      expect(response.promptForLLM).toContain('Friendly Name: mobile platform');
      expect(response.promptForLLM).toContain('Friendly Name: project name');
    });
  });

  describe('Workflow Integration', () => {
    it('should include workflowStateData in response', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform',
          },
        ],
        workflowStateData: { thread_id: 'test-workflow-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      // The response should be structured for workflow continuation
      expect(response).toHaveProperty('promptForLLM');
      expect(response).toHaveProperty('resultSchema');
    });

    it('should provide result schema as string', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(typeof response.resultSchema).toBe('string');

      // Should be valid JSON schema
      const parsedSchema = JSON.parse(response.resultSchema);
      expect(parsedSchema).toHaveProperty('type');
      expect(parsedSchema).toHaveProperty('properties');
      expect(parsedSchema.properties).toHaveProperty('userUtterance');
    });
  });

  describe('Real World Scenarios', () => {
    it('should generate guidance for single platform property', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform for the mobile app (iOS or Android)',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();

      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('platform');
      expect(response.promptForLLM).toContain('iOS or Android');
    });

    it('should generate guidance for multiple properties', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'platform',
            friendlyName: 'mobile platform',
            description: 'Target mobile platform (iOS or Android)',
          },
          {
            propertyName: 'projectName',
            friendlyName: 'project name',
            description: 'Name of the mobile application project',
          },
          {
            propertyName: 'packageName',
            friendlyName: 'package identifier',
            description:
              'The package identifier of the mobile app, for example com.company.appname',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('platform');
      expect(response.promptForLLM).toContain('projectName');
      expect(response.promptForLLM).toContain('packageName');
    });

    it('should generate guidance for Salesforce-specific properties', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'loginHost',
            friendlyName: 'Salesforce login host',
            description: 'The Salesforce login host for the mobile app.',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('loginHost');
      expect(response.promptForLLM).toContain('Salesforce login host');
    });
  });

  describe('Error Handling', () => {
    it('should return error response on exception', async () => {
      // Create a tool that will throw an error
      const errorTool = new GetInputTool(mockServer, TEST_TOOL_ID, TEST_ORCHESTRATOR_ID);

      // Override the private method to throw
      errorTool['generatePromptForInputGuidance'] = () => {
        throw new Error('Test error');
      };

      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test property',
            description: 'test description',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await errorTool.handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error: Test error');
    });

    it('should handle non-Error exceptions', async () => {
      const errorTool = new GetInputTool(mockServer, TEST_TOOL_ID, TEST_ORCHESTRATOR_ID);

      errorTool['generatePromptForInputGuidance'] = () => {
        throw 'string error';
      };

      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'test',
            friendlyName: 'test property',
            description: 'test description',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await errorTool.handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown error occurred');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty properties array', async () => {
      const input = {
        propertiesRequiringInput: [],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();

      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toBeDefined();
    });

    it('should handle properties with special characters', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'packageName',
            friendlyName: 'package identifier',
            description: 'What is your "package\\name"? Use format: {com.example}',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
    });

    it('should handle properties with unicode characters', async () => {
      const input = {
        propertiesRequiringInput: [
          {
            propertyName: 'projectName',
            friendlyName: 'project name',
            description: 'What is your project name? 🚀📱',
          },
        ],
        workflowStateData: { thread_id: 'test-123' },
      };

      const result = await tool.handleRequest(input);
      const responseText = result.content[0].text as string;
      const response = JSON.parse(responseText);

      expect(response.promptForLLM).toContain('project name');
    });
  });
});
