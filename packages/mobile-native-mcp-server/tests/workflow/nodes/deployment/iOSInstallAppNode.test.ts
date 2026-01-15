/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { iOSInstallAppNode } from '../../../../src/workflow/nodes/deployment/iOSInstallAppNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { MockTempDirectoryManager } from '../../../utils/MockTempDirectoryManager.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('iOSInstallAppNode', () => {
  let node: iOSInstallAppNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;
  let mockTempDirManager: MockTempDirectoryManager;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    mockTempDirManager = new MockTempDirectoryManager();
    node = new iOSInstallAppNode(mockCommandRunner, mockTempDirManager, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('iosInstallApp');
    });

    it('should extend BaseNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new iOSInstallAppNode(mockCommandRunner, mockTempDirManager);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-iOS platform', async () => {
      const state = createTestState({
        platform: 'Android',
        targetDevice: 'Pixel 8',
        projectName: 'TestApp',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage('Skipping iOS app install for non-iOS platform', 'debug')
      ).toBe(true);
    });

    it('should return error when targetDevice is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
        projectName: 'TestApp',
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      });
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });

    it('should return error when projectName is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        projectName: undefined,
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Project name must be specified for iOS deployment'],
      });
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });

    it('should successfully install app', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        projectName: 'TestApp',
      });

      const installResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        success: true,
        duration: 5000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(installResult);

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'install', 'iPhone 15 Pro', '/tmp/mock-temp/TestApp/TestApp.app'],
        expect.objectContaining({
          timeout: 120000,
          commandName: 'iOS App Installation',
        })
      );
      expect(mockLogger.hasLoggedMessage('iOS app installed successfully', 'info')).toBe(true);
    });

    it('should handle install failure', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        projectName: 'TestApp',
      });

      const installResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to install app',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(installResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to install iOS app to simulator "iPhone 15 Pro": Failed to install app',
        ],
      });
    });

    it('should handle exception during install', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        projectName: 'TestApp',
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Failed to install iOS app: Network error'],
      });
    });
  });
});
