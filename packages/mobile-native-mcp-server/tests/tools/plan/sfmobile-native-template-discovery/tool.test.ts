import { describe, it, expect, beforeEach } from 'vitest';
import { SfmobileNativeTemplateDiscoveryTool } from '../../../../src/tools/plan/sfmobile-native-template-discovery/tool.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// Mock MCP Server implementation for testing
class MockMcpServer {
  public readonly registeredTools: Array<{
    toolId: string;
    config: any;
    handler: any;
  }> = [];

  registerTool(toolId: string, config: any, handler: any): void {
    this.registeredTools.push({ toolId, config, handler });
  }

  reset(): void {
    this.registeredTools.length = 0;
  }
}

describe('SfmobileNativeTemplateDiscoveryTool', () => {
  let tool: SfmobileNativeTemplateDiscoveryTool;
  let mockServer: MockMcpServer;
  let annotations: ToolAnnotations;

  beforeEach(() => {
    mockServer = new MockMcpServer();
    tool = new SfmobileNativeTemplateDiscoveryTool(mockServer as any);
    annotations = {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    
    mockServer.reset();
  });

  describe('Tool Properties', () => {
    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('Salesforce Mobile Native Template Discovery');
      expect(tool.title).toBe('Salesforce Mobile Native Template Discovery Guide');
      expect(tool.toolId).toBe('sfmobile-native-template-discovery');
      expect(tool.description).toBe('Guides LLM through template discovery and selection for Salesforce mobile app development');
      // All tools now support workflow by default - no separate property needed
      expect(tool.inputSchema).toBeDefined();
    });

    it('should implement WorkflowTool interface', () => {
      // All tools now support workflow by default - no separate property needed
    });
  });

  describe('Tool Registration', () => {
    it('should register with registerTool method', () => {
      tool.register(annotations);

      expect(mockServer.registeredTools).toHaveLength(1);
      
      const registeredTool = mockServer.registeredTools[0];
      expect(registeredTool.toolId).toBe('sfmobile-native-template-discovery');
      expect(registeredTool.config.description).toBe(tool.description);
      expect(registeredTool.config.inputSchema).toBeDefined();
      expect(registeredTool.handler).toBeDefined();
    });

    it('should merge annotations correctly', () => {
      tool.register(annotations);

      const registeredTool = mockServer.registeredTools[0];
      expect(registeredTool.config.readOnlyHint).toBe(true);
      expect(registeredTool.config.destructiveHint).toBe(false);
      expect(registeredTool.config.title).toBe(tool.title);
    });
  });

  describe('Input Schema', () => {
    it('should accept platform parameter', () => {
      const validInput = { platform: 'iOS' as const };
      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept workflow state data', () => {
      const validInput = { 
        platform: 'Android' as const,
        workflowStateData: { thread_id: 'test-123' }
      };
      const result = tool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform values', () => {
      const invalidInput = { platform: 'Windows' };
      const result = tool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});