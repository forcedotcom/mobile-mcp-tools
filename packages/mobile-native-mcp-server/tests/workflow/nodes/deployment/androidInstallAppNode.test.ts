/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import path from 'node:path';
import { AndroidInstallAppNode } from '../../../../src/workflow/nodes/deployment/androidInstallAppNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';

describe('AndroidInstallAppNode', () => {
  let node: AndroidInstallAppNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    node = new AndroidInstallAppNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('androidInstallApp');
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
      const nodeWithoutLogger = new AndroidInstallAppNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-Android platform', async () => {
      const state = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage(
          'Skipping Android app install for non-Android platform',
          'debug'
        )
      ).toBe(true);
    });

    it('should return error when projectPath is missing', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: undefined,
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Project path must be specified for Android deployment'],
      });
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
    });

    it('should successfully install debug app', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        buildType: 'debug',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      const installResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 30000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(installResult);

      const result = await node.execute(state);

      expect(result).toEqual({});
      const expectedApkPath = path.join(
        '/path/to/project',
        'app',
        'build',
        'outputs',
        'apk',
        'debug',
        'app-debug.apk'
      );
      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'sf',
        [
          'force',
          'lightning',
          'local',
          'app',
          'install',
          '-p',
          'android',
          '-t',
          'Pixel_8_API_34',
          '-a',
          expectedApkPath,
        ],
        expect.objectContaining({
          timeout: 300000,
          cwd: '/path/to/project',
          commandName: 'Android App Installation',
          progressReporter: undefined,
        })
      );
      expect(mockLogger.hasLoggedMessage('Android app installed successfully', 'info')).toBe(true);
    });

    it('should successfully install release app', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        buildType: 'release',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      const installResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 30000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(installResult);

      const result = await node.execute(state);

      expect(result).toEqual({});
      const expectedApkPath = path.join(
        '/path/to/project',
        'app',
        'build',
        'outputs',
        'apk',
        'release',
        'app-release.apk'
      );
      expect(mockCommandRunner.execute).toHaveBeenCalledWith(
        'sf',
        [
          'force',
          'lightning',
          'local',
          'app',
          'install',
          '-p',
          'android',
          '-t',
          'Pixel_8_API_34',
          '-a',
          expectedApkPath,
        ],
        expect.objectContaining({
          timeout: 300000,
          cwd: '/path/to/project',
          commandName: 'Android App Installation',
          progressReporter: undefined,
        })
      );
    });

    it('should handle install failure', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        buildType: 'debug',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      const installResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'BUILD FAILED',
        success: false,
        duration: 100,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValueOnce(installResult);

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Failed to install Android app: BUILD FAILED'],
      });
    });

    it('should handle exception during install', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        buildType: 'debug',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Failed to install Android app: Network error'],
      });
    });
  });
});
