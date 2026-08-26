/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RetrieveConnectedAppMetadataNode } from '../../../src/workflow/nodes/retrieveConnectedAppMetadata.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { type CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';
import { MockLogger } from '../../utils/MockLogger.js';
import * as fs from 'fs';
import { join } from 'path';

// Mock fs, os, and crypto modules
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdtempSync: vi.fn(),
    readFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789abc'),
}));

describe('RetrieveConnectedAppMetadataNode', () => {
  let mockCommandRunner: CommandRunner;
  let mockLogger: MockLogger;
  let node: RetrieveConnectedAppMetadataNode;

  const defaultSuccessResult: CommandResult = {
    exitCode: 0,
    signal: null,
    stdout: '',
    stderr: '',
    success: true,
    duration: 1000,
  };

  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">
  <contactEmail>admin@example.com</contactEmail>
  <label>MyApp</label>
  <oauthConfig>
    <callbackUrl>myapp://oauth/callback</callbackUrl>
    <consumerKey>3MVG9abc123def456</consumerKey>
    <isAdminApproved>false</isAdminApproved>
    <scopes>Api</scopes>
    <scopes>Web</scopes>
    <scopes>RefreshToken</scopes>
  </oauthConfig>
</ConnectedApp>`;

  const retrieveResponse = {
    status: 0,
    result: {
      done: true,
      status: 'Succeeded',
      success: true,
      files: [
        {
          fullName: 'MyApp',
          type: 'ConnectedApp',
          state: 'Changed',
          filePath: 'force-app/main/default/connectedApps/MyApp.connectedApp-meta.xml',
        },
      ],
      fileProperties: [
        {
          fullName: 'MyApp',
          type: 'ConnectedApp',
          fileName: 'connectedApps/MyApp.connectedApp',
        },
      ],
    },
  };

  const orgDisplayResponse = {
    status: 0,
    result: {
      instanceUrl: 'https://myorg.my.salesforce.com',
    },
  };

  beforeEach(() => {
    mockCommandRunner = {
      execute: vi.fn(),
    };
    mockLogger = new MockLogger();
    node = new RetrieveConnectedAppMetadataNode(mockCommandRunner, mockLogger);

    // Default mocks
    vi.mocked(fs.mkdtempSync).mockReturnValue('/tmp/magen-retrieve-abc');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(sampleXml);
    vi.mocked(fs.rmSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockLogger.reset();
  });

  describe('Constructor', () => {
    it('should have the correct node name', () => {
      expect(node.name).toBe('retrieveConnectedAppMetadata');
    });

    it('should use default logger when none provided', () => {
      const nodeWithDefaultLogger = new RetrieveConnectedAppMetadataNode(mockCommandRunner);
      expect(nodeWithDefaultLogger).toBeDefined();
    });
  });

  describe('execute() - Resume support', () => {
    it('should skip retrieval if credentials already exist in state', async () => {
      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
        connectedAppClientId: '3MVG9abc123',
        connectedAppCallbackUri: 'myapp://oauth/callback',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Validation', () => {
    it('should return fatal error if no connected app selected', async () => {
      const state = createTestState({
        selectedConnectedAppName: undefined,
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('No Connected App selected');
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Successful retrieval', () => {
    it('should retrieve and parse connected app metadata', async () => {
      // Mock sf project generate
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult }) // project generate
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        }) // project retrieve start
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(orgDisplayResponse),
        }); // org display

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.connectedAppClientId).toBe('3MVG9abc123def456');
      expect(result.connectedAppCallbackUri).toBe('myapp://oauth/callback');
      expect(result.loginHost).toBe('https://myorg.my.salesforce.com');
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should include target org when selectedOrgUsername is set', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(orgDisplayResponse),
        });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
        selectedOrgUsername: 'user@example.com',
      });

      await node.execute(state);

      // Check the retrieve command includes -o flag
      const retrieveCall = vi.mocked(mockCommandRunner.execute).mock.calls[1];
      expect(retrieveCall[1]).toContain('-o');
      expect(retrieveCall[1]).toContain('user@example.com');

      // Check the org display command includes -o flag
      const orgDisplayCall = vi.mocked(mockCommandRunner.execute).mock.calls[2];
      expect(orgDisplayCall[1]).toContain('-o');
      expect(orgDisplayCall[1]).toContain('user@example.com');
    });

    it('should use default login host when org display fails', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          success: false,
          stderr: 'org display error',
        });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.connectedAppClientId).toBe('3MVG9abc123def456');
      expect(result.loginHost).toBe('https://login.salesforce.com');
    });

    it('should use default login host when org display throws', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        })
        .mockRejectedValueOnce(new Error('org display timeout'));

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.connectedAppClientId).toBe('3MVG9abc123def456');
      expect(result.loginHost).toBe('https://login.salesforce.com');
    });

    it('should resolve relative filePath against project directory', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(orgDisplayResponse),
        });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      await node.execute(state);

      // readFileSync should be called with the resolved path (relative filePath joined to project dir)
      const expectedXmlPath = join(
        '/tmp/magen-retrieve-abc',
        'tmpproj_12345678',
        'force-app/main/default/connectedApps/MyApp.connectedApp-meta.xml'
      );
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedXmlPath, 'utf-8');
    });
  });

  describe('execute() - Project generation failure', () => {
    it('should return fatal error when sf project generate fails', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce({
        ...defaultSuccessResult,
        success: false,
        exitCode: 1,
        stderr: 'project generation error',
      });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Failed to generate temporary SFDX project'
      );
    });

    it('should handle project generation failure without stderr', async () => {
      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce({
        ...defaultSuccessResult,
        success: false,
        exitCode: 1,
        stderr: '',
        signal: 'SIGKILL',
      });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('SIGKILL');
    });
  });

  describe('execute() - Retrieve failure', () => {
    it('should return fatal error when sf project retrieve fails', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult }) // project generate ok
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          success: false,
          exitCode: 1,
          stderr: 'retrieve error',
        });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Failed to retrieve Connected App metadata'
      );
    });

    it('should return fatal error when retrieve JSON parsing fails', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: 'not valid json',
        });

      // existsSync returns false for the xml file path since parsing failed
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('metadata file not found');
    });

    it('should return fatal error when XML file does not exist', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        });

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('metadata file not found');
    });

    it('should return fatal error when retrieve response has no matching file', async () => {
      const emptyFilesResponse = {
        status: 0,
        result: {
          done: true,
          status: 'Succeeded',
          success: true,
          files: [],
          fileProperties: [],
        },
      };

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(emptyFilesResponse),
        });

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('metadata file not found');
    });
  });

  describe('execute() - XML parsing', () => {
    it('should return fatal error when XML has no consumerKey', async () => {
      const xmlWithoutKey = `<?xml version="1.0" encoding="UTF-8"?>
<ConnectedApp>
  <oauthConfig>
    <callbackUrl>myapp://oauth/callback</callbackUrl>
  </oauthConfig>
</ConnectedApp>`;

      vi.mocked(fs.readFileSync).mockReturnValue(xmlWithoutKey);

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Failed to extract OAuth credentials'
      );
    });

    it('should return fatal error when XML has no callbackUrl', async () => {
      const xmlWithoutCallback = `<?xml version="1.0" encoding="UTF-8"?>
<ConnectedApp>
  <oauthConfig>
    <consumerKey>3MVG9abc123def456</consumerKey>
  </oauthConfig>
</ConnectedApp>`;

      vi.mocked(fs.readFileSync).mockReturnValue(xmlWithoutCallback);

      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult })
        .mockResolvedValueOnce({
          ...defaultSuccessResult,
          stdout: JSON.stringify(retrieveResponse),
        });

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Failed to extract OAuth credentials'
      );
    });
  });

  describe('execute() - General error handling', () => {
    it('should return fatal error when commandRunner rejects inside try block', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult }) // project generate
        .mockRejectedValueOnce(new Error('network timeout'));

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('network timeout');
    });

    it('should handle non-Error exception from commandRunner', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult }) // project generate
        .mockRejectedValueOnce('string error');

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      const result = await node.execute(state);

      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('string error');
    });

    it('should clean up temp directory even on error', async () => {
      vi.mocked(mockCommandRunner.execute)
        .mockResolvedValueOnce({ ...defaultSuccessResult }) // project generate
        .mockRejectedValueOnce(new Error('retrieve failed'));

      const state = createTestState({
        selectedConnectedAppName: 'MyApp',
      });

      await node.execute(state);

      expect(fs.rmSync).toHaveBeenCalledWith('/tmp/magen-retrieve-abc', {
        recursive: true,
        force: true,
      });
    });
  });
});
