/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { iOSLaunchAppNode } from '../../../../src/workflow/nodes/deployment/ios/iOSLaunchAppNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';
import { readdir, readFile } from 'fs/promises';

vi.mock('fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(),
    readFile: vi.fn(),
  };
});

describe('iOSLaunchAppNode', () => {
  let node: iOSLaunchAppNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    node = new iOSLaunchAppNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    vi.mocked(readdir).mockReset();
    vi.mocked(readFile).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('iosLaunchApp');
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
      const nodeWithoutLogger = new iOSLaunchAppNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-iOS platform', async () => {
      const state = createTestState({
        platform: 'Android',
        targetDevice: 'Pixel 8',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage('Skipping iOS app launch for non-iOS platform', 'debug')
      ).toBe(true);
    });

    it('should return error when targetDevice is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: undefined,
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      });
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });

    it('should return error when packageName is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: undefined,
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Package name and project name must be specified for iOS app launch',
        ],
      });
    });

    it('should return error when projectPath is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: undefined,
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Project path must be specified for iOS app launch'],
      });
    });

    it('should successfully launch app', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('PRODUCT_BUNDLE_IDENTIFIER = "com.test.app";');

      const launchResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'com.test.app: 12345',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(launchResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        deploymentStatus: 'success',
      });
      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'launch', 'iPhone 15 Pro', 'com.test.app'],
        expect.objectContaining({
          timeout: 30000,
          commandName: 'iOS App Launch',
        })
      );
      expect(mockLogger.hasLoggedMessage('iOS app launched successfully', 'info')).toBe(true);
    });

    it('should handle launch failure', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('PRODUCT_BUNDLE_IDENTIFIER = "com.test.app";');

      const launchResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Failed to launch app',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(launchResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Failed to launch iOS app on simulator "iPhone 15 Pro": Failed to launch app',
        ],
      });
    });

    it('should propagate error when reading project directory fails', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockRejectedValue(new Error('Permission denied'));

      // Errors from readBundleIdFromProject are propagated (consistent with refactored pattern)
      await expect(node.execute(state)).rejects.toThrow(
        'Failed to read project directory at /path/to/project: Permission denied'
      );
    });

    it('should propagate error when no .xcodeproj found', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['somefile.txt'] as unknown as string[]);

      await expect(node.execute(state)).rejects.toThrow(
        'No .xcodeproj directory found in project path: /path/to/project'
      );
    });

    it('should propagate error when reading project.pbxproj fails', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      await expect(node.execute(state)).rejects.toThrow('Failed to read project.pbxproj file');
    });

    it('should propagate error when PRODUCT_BUNDLE_IDENTIFIER is missing', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('// No bundle identifier here');

      await expect(node.execute(state)).rejects.toThrow('Could not find PRODUCT_BUNDLE_IDENTIFIER');
    });

    it('should propagate error when bundle ID has unresolved variables', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue(
        'PRODUCT_BUNDLE_IDENTIFIER = "com.test.${PRODUCT_NAME:rfc1034identifier}";'
      );

      await expect(node.execute(state)).rejects.toThrow('Bundle ID contains unresolved variables');
    });

    it('should propagate exception during launch', async () => {
      const state = createTestState({
        platform: 'iOS',
        targetDevice: 'iPhone 15 Pro',
        packageName: 'com.test.app',
        projectName: 'TestApp',
        projectPath: '/path/to/project',
      });

      vi.mocked(readdir).mockResolvedValue(['TestApp.xcodeproj'] as unknown as string[]);
      vi.mocked(readFile).mockResolvedValue('PRODUCT_BUNDLE_IDENTIFIER = "com.test.app";');

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      // Exceptions from command execution are propagated
      await expect(node.execute(state)).rejects.toThrow('Network error');
    });
  });
});
