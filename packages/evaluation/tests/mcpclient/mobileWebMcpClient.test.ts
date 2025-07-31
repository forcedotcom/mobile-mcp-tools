import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MobileWebMcpClient } from '../../src/mcpclient/mobileWebMcpClient.js';

// Integration tests against the real MCP server
describe('MobileWebMcpClient (integration)', () => {
  let client: MobileWebMcpClient;

  beforeAll(async () => {
    client = new MobileWebMcpClient();
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  const toolNameToGroundingTitleMapping: Record<string, string> = {
    'sfmobile-web-app-review': 'App Review Service Grounding Context',
    'sfmobile-web-ar-space-capture': 'AR Space Capture Service Grounding Context',
    'sfmobile-web-barcode-scanner': 'Barcode Scanner Service Grounding Context',
    'sfmobile-web-biometrics': 'Biometrics Service Grounding Context',
    'sfmobile-web-calendar': 'Calendar Service Grounding Context',
    'sfmobile-web-contacts': 'Contacts Service Grounding Context',
    'sfmobile-web-document-scanner': 'Document Scanner Service Grounding Context',
    'sfmobile-web-geofencing': 'Geofencing Service Grounding Context',
    'sfmobile-web-location': 'Location Service Grounding Context',
    'sfmobile-web-nfc': 'NFC Service Grounding Context',
    'sfmobile-web-payments': 'Payments Service Grounding Context',
  };

  it('should list available tools', async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map(tool => tool.name);
    expect(toolNames).toEqual(expect.arrayContaining(Object.keys(toolNameToGroundingTitleMapping)));
  });

  // Test each tool with the correct grounding context
  it.each(Object.keys(toolNameToGroundingTitleMapping))(
    'should call a tool %s and return correct grounding context',
    async toolName => {
      const groundTitle = toolNameToGroundingTitleMapping[toolName];
      const result = await client.callTool(toolName, {});
      const groundingContext = result.content?.[0]?.text;
      expect(groundingContext).toEqual(expect.stringContaining(groundTitle));
    }
  );
});
