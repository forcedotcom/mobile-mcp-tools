/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AndroidLaunchAppNode } from '../../../../src/workflow/nodes/deployment/androidLaunchAppNode.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createTestState } from '../../../utils/stateBuilders.js';
import { CommandRunner, type CommandResult } from '@salesforce/magen-mcp-workflow';
import { readFileSync } from 'node:fs';

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

describe('AndroidLaunchAppNode', () => {
  let node: AndroidLaunchAppNode;
  let mockLogger: MockLogger;
  let mockCommandRunner: CommandRunner;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockCommandRunner = {
      execute: vi.fn(),
    };
    node = new AndroidLaunchAppNode(mockCommandRunner, mockLogger);
    vi.mocked(mockCommandRunner.execute).mockReset();
    vi.mocked(readFileSync).mockReset();
    mockLogger.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('androidLaunchApp');
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
      const nodeWithoutLogger = new AndroidLaunchAppNode(mockCommandRunner);
      expect(nodeWithoutLogger['logger']).toBeDefined();
      expect(nodeWithoutLogger['logger']).not.toBe(mockLogger);
    });
  });

  describe('execute()', () => {
    it('should skip for non-Android platform', async () => {
      const state = createTestState({
        platform: 'iOS',
        projectPath: '/path/to/project',
        packageName: 'com.test.app',
      });

      const result = await node.execute(state);

      expect(result).toEqual({});
      expect(mockCommandRunner.execute).not.toHaveBeenCalled();
      expect(
        mockLogger.hasLoggedMessage('Skipping Android app launch for non-Android platform', 'debug')
      ).toBe(true);
    });

    it('should return error when projectPath is missing', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: undefined,
        packageName: 'com.test.app',
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: ['Project path must be specified for Android deployment'],
      });
    });

    it('should successfully launch app using packageName', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        packageName: 'com.test.app',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      // Mock build.gradle to not have applicationId (will fall back to packageName)
      vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
        const path = String(filePath);
        if (path.includes('build.gradle')) {
          throw new Error('File not found');
        }
        if (path.includes('AndroidManifest.xml')) {
          return `<activity android:name=".MainActivity">
            <intent-filter>
              <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
          </activity>`;
        }
        throw new Error('File not found');
      });

      const launchResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
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
        'sf',
        [
          'force',
          'lightning',
          'local',
          'app',
          'launch',
          '-p',
          'android',
          '-t',
          'Pixel_8_API_34',
          '-i',
          'com.test.app/.MainActivity',
        ],
        expect.objectContaining({
          timeout: 30000,
          commandName: 'Android App Launch',
        })
      );
      expect(mockLogger.hasLoggedMessage('Android app launched successfully', 'info')).toBe(true);
    });

    it('should successfully launch app using applicationId from build.gradle', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        packageName: undefined,
        androidEmulatorName: 'Pixel_8_API_34',
      });

      vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
        const path = String(filePath);
        if (path.includes('build.gradle')) {
          return 'applicationId = "com.test.app"';
        }
        if (path.includes('AndroidManifest.xml')) {
          return `<activity android:name=".MainActivity">
            <intent-filter>
              <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
          </activity>`;
        }
        throw new Error('File not found');
      });

      const launchResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: '',
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
        'sf',
        [
          'force',
          'lightning',
          'local',
          'app',
          'launch',
          '-p',
          'android',
          '-t',
          'Pixel_8_API_34',
          '-i',
          'com.test.app/.MainActivity',
        ],
        expect.objectContaining({
          timeout: 30000,
          commandName: 'Android App Launch',
        })
      );
    });

    it('should return error when applicationId cannot be determined', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        packageName: undefined,
        androidEmulatorName: 'Pixel_8_API_34',
      });

      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await node.execute(state);

      expect(result).toEqual({
        workflowFatalErrorMessages: [
          'Application ID must be specified for Android app launch. Please ensure build.gradle contains applicationId.',
        ],
      });
    });

    it('should handle launch failure', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        packageName: 'com.test.app',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
        const path = String(filePath);
        if (path.includes('build.gradle')) {
          throw new Error('File not found');
        }
        if (path.includes('AndroidManifest.xml')) {
          return `<activity android:name=".MainActivity">
            <intent-filter>
              <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
          </activity>`;
        }
        throw new Error('File not found');
      });

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
          'Failed to launch Android app "com.test.app": Failed to launch app',
        ],
      });
    });

    it('should propagate exception during launch', async () => {
      const state = createTestState({
        platform: 'Android',
        projectPath: '/path/to/project',
        packageName: 'com.test.app',
        androidEmulatorName: 'Pixel_8_API_34',
      });

      vi.mocked(readFileSync).mockImplementation((filePath: unknown) => {
        const path = String(filePath);
        if (path.includes('build.gradle')) {
          throw new Error('File not found');
        }
        if (path.includes('AndroidManifest.xml')) {
          return `<activity android:name=".MainActivity">
            <intent-filter>
              <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
          </activity>`;
        }
        throw new Error('File not found');
      });

      vi.mocked(mockCommandRunner.execute).mockRejectedValueOnce(new Error('Network error'));

      // Exceptions now propagate (consistent with refactored pattern)
      await expect(node.execute(state)).rejects.toThrow('Network error');
    });
  });
});
