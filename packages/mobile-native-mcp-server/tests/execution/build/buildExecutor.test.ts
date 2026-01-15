/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultBuildExecutor } from '../../../src/execution/build/buildExecutor.js';
import {
  CommandRunner,
  ProgressReporter,
  type CommandResult,
} from '@salesforce/magen-mcp-workflow';
import { MockTempDirectoryManager } from '../../utils/MockTempDirectoryManager.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { PlatformEnum } from '../../../src/common/schemas.js';

describe('DefaultBuildExecutor', () => {
  let buildExecutor: DefaultBuildExecutor;
  let mockCommandRunner: CommandRunner;
  let mockTempDirManager: MockTempDirectoryManager;
  let mockLogger: MockLogger;
  let mockProgressReporter: ProgressReporter;

  beforeEach(() => {
    mockCommandRunner = {
      execute: vi.fn(),
    };
    mockTempDirManager = new MockTempDirectoryManager();
    mockLogger = new MockLogger();
    mockProgressReporter = {
      report: vi.fn(),
    };

    buildExecutor = new DefaultBuildExecutor(mockCommandRunner, mockTempDirManager, mockLogger);
  });

  describe('execute', () => {
    it('should implement BuildExecutor interface', () => {
      expect(buildExecutor.execute).toBeDefined();
      expect(typeof buildExecutor.execute).toBe('function');
    });

    it('should select iOS factory for iOS platform', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCEEDED',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'iOS' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      expect(mockCommandRunner.execute).toHaveBeenCalled();
      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[0]).toBe('sh');
      expect(callArgs[1][1]).toContain('xcodebuild');
    });

    it('should select Android factory for Android platform', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      expect(mockCommandRunner.execute).toHaveBeenCalled();
      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[0]).toBe('sh');
      expect(callArgs[1][1]).toContain('./gradlew assemble');
    });

    it('should return successful result when build succeeds', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params, mockProgressReporter);

      expect(result.buildSuccessful).toBe(true);
      expect(result.buildOutputFilePath).toBeUndefined();
      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should return failure result when build fails', async () => {
      const mockResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: 'BUILD FAILED',
        stderr: 'Error: Build failed',
        success: false,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params, mockProgressReporter);

      expect(result.buildSuccessful).toBe(false);
      expect(result.buildOutputFilePath).toBeDefined();
      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });

    it('should use stderr as error when available', async () => {
      const mockResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: '',
        stderr: 'Error: Build failed',
        success: false,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params, mockProgressReporter);

      expect(result.error).toBe('Error: Build failed');
    });

    it('should use stdout as error when stderr is empty', async () => {
      const mockResult: CommandResult = {
        exitCode: 1,
        signal: null,
        stdout: 'Build output with error',
        stderr: '',
        success: false,
        duration: 500,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params, mockProgressReporter);

      expect(result.error).toBe('Build output with error');
    });

    it('should pass progress reporter to command runner', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[2]?.progressReporter).toBe(mockProgressReporter);
    });

    it('should pass progress parser to command runner', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[2]?.progressParser).toBeDefined();
      expect(typeof callArgs[2]?.progressParser).toBe('function');
    });

    it('should set output file path', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[2]?.outputFilePath).toBeDefined();
    });

    it('should use correct build output path for iOS', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCEEDED',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'iOS' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[2]?.outputFilePath).toBe(mockTempDirManager.getIOSBuildOutputFilePath());
    });

    it('should use correct build output path for Android', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[2]?.outputFilePath).toBe(mockTempDirManager.getAndroidBuildOutputFilePath());
    });

    it('should pass command environment and cwd from factory', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      expect(callArgs[2]?.env).toBeDefined();
      expect(callArgs[2]?.cwd).toBe('/path/to/project');
    });

    it('should handle command execution errors', async () => {
      const error = new Error('Command execution failed');
      vi.mocked(mockCommandRunner.execute).mockRejectedValue(error);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params, mockProgressReporter);

      expect(result.buildSuccessful).toBe(false);
      expect(result.error).toBe('Command execution failed');
      expect(result.buildOutputFilePath).toBeDefined();
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockCommandRunner.execute).mockRejectedValue('String error');

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params, mockProgressReporter);

      expect(result.buildSuccessful).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('should work without progress reporter', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      const result = await buildExecutor.execute(params);

      expect(result.buildSuccessful).toBe(true);
    });

    it('should log execution start', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      expect(mockLogger.hasLoggedMessage('Executing build', 'info')).toBe(true);
    });

    it('should log execution completion', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      expect(mockLogger.hasLoggedMessage('Build execution completed', 'info')).toBe(true);
    });

    it('should log execution failure', async () => {
      const error = new Error('Build failed');
      vi.mocked(mockCommandRunner.execute).mockRejectedValue(error);

      const params = {
        platform: 'Android' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'TestApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      expect(mockLogger.hasLoggedMessage('Build execution failed', 'info')).toBe(true);
    });

    it('should use app artifact root path for build output dir', async () => {
      const mockResult: CommandResult = {
        exitCode: 0,
        signal: null,
        stdout: 'BUILD SUCCESSFUL',
        stderr: '',
        success: true,
        duration: 1000,
      };

      vi.mocked(mockCommandRunner.execute).mockResolvedValue(mockResult);

      const params = {
        platform: 'iOS' as PlatformEnum,
        projectPath: '/path/to/project',
        projectName: 'MyApp',
      };

      await buildExecutor.execute(params, mockProgressReporter);

      const callArgs = vi.mocked(mockCommandRunner.execute).mock.calls[0];
      // iOS command should include the app artifact root path
      expect(callArgs[1][1]).toContain(mockTempDirManager.getAppArtifactRootPath('MyApp'));
    });
  });
});
