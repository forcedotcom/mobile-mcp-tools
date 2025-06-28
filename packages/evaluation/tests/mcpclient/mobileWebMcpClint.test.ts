import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MobileWebMcpClient } from '../../src/mcpclient/mobileWebMcpClient.js';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';

// Integration tests against the real MCP server
describe('MobileWebMcpClient (integration)', () => {
  let client: MobileWebMcpClient;
  let serverProcess: import('child_process').ChildProcess;

  beforeAll(async () => {
    // Build all packages before starting the server
    execSync('npm run build:all', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../../../..'),
    });

    // Start the MCP server
    serverProcess = spawn('npm', ['run', 'mobile-web:server:start'], {
      cwd: path.resolve(__dirname, '../../../..'),
      stdio: 'inherit',
      shell: true,
    });

    // Wait for the server to be ready (simple delay, adjust as needed)
    await new Promise(resolve => setTimeout(resolve, 3000));

    client = new MobileWebMcpClient();
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
    if (serverProcess) {
      serverProcess.kill();
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

  it.each(Object.keys(toolNameToGroundingTitleMapping))(
    'should call a tool %s and return a result',
    async toolName => {
      const result = await client.callTool(toolName, {});
      const groundingContext = result.content?.[0]?.text;
      expect(groundingContext).toEqual(
        expect.stringContaining(toolNameToGroundingTitleMapping[toolName])
      );
    }
  );
});
