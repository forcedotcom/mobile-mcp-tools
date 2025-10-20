/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformCheckNode } from '../../../src/workflow/nodes/checkPlatformSetup.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { MockLogger } from '../../utils/MockLogger.js';
import * as childProcess from 'child_process';

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('PlatformCheckNode', () => {
  let node: PlatformCheckNode;
  let mockLogger: MockLogger;
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogger = new MockLogger();
    node = new PlatformCheckNode(mockLogger);
    mockExecSync = vi.mocked(childProcess.execSync);
    mockExecSync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('checkPlatformSetup');
    });

    it('should extend BaseNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new PlatformCheckNode();
      expect(nodeWithoutLogger).toBeDefined();
    });

    it('should use provided logger', () => {
      const customLogger = new MockLogger();
      const nodeWithCustomLogger = new PlatformCheckNode(customLogger);
      expect(nodeWithCustomLogger['logger']).toBe(customLogger);
    });
  });

  describe('execute() - iOS Platform - Success', () => {
    it('should handle successful iOS platform check', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          totalDuration: '2.5s',
          tests: [
            {
              title: 'Node.js Version Check',
              hasPassed: true,
              duration: '0.5s',
              message: 'Node.js version 18.0.0 is installed',
            },
            {
              title: 'Xcode Installation Check',
              hasPassed: true,
              duration: '1.0s',
              message: 'Xcode 15.0 is installed',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
      expect(mockExecSync).toHaveBeenCalledWith(
        'sf force lightning local setup -p ios -l 17.0 --json',
        { encoding: 'utf-8', timeout: 20000 }
      );
    });

    it('should handle iOS platform check with all requirements met', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          tests: [],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should use correct API level for iOS', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('-l 17.0'),
        expect.any(Object)
      );
    });
  });

  describe('execute() - Android Platform - Success', () => {
    it('should handle successful Android platform check', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          totalDuration: '3.0s',
          tests: [
            {
              title: 'Node.js Version Check',
              hasPassed: true,
              duration: '0.5s',
              message: 'Node.js version 18.0.0 is installed',
            },
            {
              title: 'Android SDK Check',
              hasPassed: true,
              duration: '1.5s',
              message: 'Android SDK is properly configured',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
      expect(mockExecSync).toHaveBeenCalledWith(
        'sf force lightning local setup -p android -l 35 --json',
        { encoding: 'utf-8', timeout: 20000 }
      );
    });

    it('should use correct API level for Android', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('-l 35'),
        expect.any(Object)
      );
    });
  });

  describe('execute() - Invalid Platform', () => {
    it('should handle invalid platform', () => {
      const inputState = createTestState({
        platform: 'Windows' as any,
      });

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(1);
      expect(result.workflowFatalErrorMessages![0]).toContain('Invalid platform: Windows');
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should handle missing platform', () => {
      const inputState = createTestState({
        platform: undefined,
      });

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should not execute command for invalid platform', () => {
      const inputState = createTestState({
        platform: 'Linux' as any,
      });

      node.execute(inputState);

      expect(mockExecSync).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Platform Check Failures', () => {
    it('should handle platform check with some failed requirements', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: false,
          totalDuration: '2.0s',
          tests: [
            {
              title: 'Node.js Version Check',
              hasPassed: true,
              duration: '0.5s',
              message: 'Node.js version 18.0.0 is installed',
            },
            {
              title: 'Xcode Installation Check',
              hasPassed: false,
              duration: '1.0s',
              message: 'Xcode is not installed. Please install Xcode from the App Store.',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(1);
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Xcode is not installed. Please install Xcode from the App Store.'
      );
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'sf force lightning local setup -p ios -l 17.0 --json'
      );
    });

    it('should handle platform check with multiple failed requirements', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: false,
          totalDuration: '3.5s',
          tests: [
            {
              title: 'Node.js Version Check',
              hasPassed: false,
              duration: '0.5s',
              message: 'Node.js version is too old. Minimum required: 18.0.0',
            },
            {
              title: 'Android SDK Check',
              hasPassed: false,
              duration: '1.0s',
              message: 'Android SDK not found. Please install Android Studio.',
            },
            {
              title: 'Java Version Check',
              hasPassed: true,
              duration: '0.5s',
              message: 'Java 11 is installed',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(2);
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Node.js version is too old. Minimum required: 18.0.0'
      );
      expect(result.workflowFatalErrorMessages![1]).toContain(
        'Android SDK not found. Please install Android Studio.'
      );
    });

    it('should handle platform check with all requirements failed', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: false,
          tests: [
            {
              title: 'Check 1',
              hasPassed: false,
              message: 'Failure 1',
            },
            {
              title: 'Check 2',
              hasPassed: false,
              message: 'Failure 2',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toHaveLength(2);
    });
  });

  describe('execute() - Command Execution Errors', () => {
    it('should handle execSync throwing an error', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found: sf');
      });

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(1);
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Error executing platform check command'
      );
      expect(result.workflowFatalErrorMessages![0]).toContain('Command not found: sf');
    });

    it('should handle non-Error exceptions', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      mockExecSync.mockImplementation(() => {
        throw 'Unknown error';
      });

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Error executing platform check command'
      );
      expect(result.workflowFatalErrorMessages![0]).toContain('Unknown error');
    });

    it('should handle timeout errors', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockImplementation(() => {
        const error = new Error('Command timed out after 20000ms');
        throw error;
      });

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('timed out');
    });
  });

  describe('execute() - JSON Parsing Errors', () => {
    it('should handle invalid JSON output', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue('This is not valid JSON');

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(1);
      expect(result.workflowFatalErrorMessages![0]).toContain('Command output is not valid JSON');
    });

    it('should handle empty output', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      mockExecSync.mockReturnValue('');

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Command output is not valid JSON');
    });

    it('should handle JSON with missing outputContent', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          someOtherField: 'value',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Command output is not valid JSON');
    });
  });

  describe('execute() - Schema Validation Errors', () => {
    it('should handle invalid schema - missing hasMetAllRequirements', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            tests: [],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Command output is not valid JSON');
    });

    it('should handle invalid schema - missing tests array', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Command output is not valid JSON');
    });

    it('should handle invalid test object schema', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [
              {
                title: 'Test',
                hasPassed: true,
                // Missing required 'message' field
              },
            ],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
    });

    it('should handle optional fields in schema', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          // Optional totalDuration omitted
          tests: [
            {
              title: 'Test',
              hasPassed: true,
              message: 'Success',
              // Optional duration omitted
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
    });
  });

  describe('execute() - Logging', () => {
    it('should log debug message before command execution', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const preExecutionLog = debugLogs.find(log =>
        log.message.includes('Executing command (pre-execution)')
      );
      expect(preExecutionLog).toBeDefined();
    });

    it('should log debug message after command execution', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          tests: [],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const postExecutionLog = debugLogs.find(log =>
        log.message.includes('Executing command (post-execution)')
      );
      expect(postExecutionLog).toBeDefined();
    });

    it('should log command in debug message', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const commandLog = debugLogs.find(
        log =>
          log.data &&
          typeof log.data === 'object' &&
          'command' in log.data &&
          (log.data as any).command?.includes('sf force lightning local setup')
      );
      expect(commandLog).toBeDefined();
    });
  });

  describe('execute() - Return Value', () => {
    it('should return partial state object', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('validPlatformSetup');
      expect(typeof result.validPlatformSetup).toBe('boolean');
    });

    it('should return all expected properties on success', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result).toHaveProperty('validPlatformSetup');
      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should return all expected properties on failure', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: false,
            tests: [
              {
                title: 'Test',
                hasPassed: false,
                message: 'Failed',
              },
            ],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result).toHaveProperty('validPlatformSetup');
      expect(result).toHaveProperty('workflowFatalErrorMessages');
      expect(result.validPlatformSetup).toBe(false);
      expect(Array.isArray(result.workflowFatalErrorMessages)).toBe(true);
    });
  });

  describe('execute() - State Independence', () => {
    it('should only depend on platform from state', () => {
      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'TestProject',
        packageName: 'com.test.app',
        organization: 'TestOrg',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      // Command should only use platform, not other state properties
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.not.stringContaining('TestProject'),
        expect.any(Object)
      );
    });

    it('should not modify input state', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const originalPlatform = inputState.platform;

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      expect(inputState.platform).toBe(originalPlatform);
    });

    it('should produce consistent results for same platform', () => {
      const state1 = createTestState({
        platform: 'iOS',
        projectName: 'Project1',
      });

      const state2 = createTestState({
        platform: 'iOS',
        projectName: 'Project2',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      const result1 = node.execute(state1);
      const result2 = node.execute(state2);

      expect(result1.validPlatformSetup).toBe(result2.validPlatformSetup);
    });
  });

  describe('execute() - Real World Scenarios', () => {
    it('should handle typical iOS setup check success', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          totalDuration: '5.2s',
          tests: [
            {
              title: 'Node.js Version',
              hasPassed: true,
              duration: '0.8s',
              message: 'Node.js v20.10.0 detected',
            },
            {
              title: 'Xcode Installation',
              hasPassed: true,
              duration: '2.1s',
              message: 'Xcode 15.1 found at /Applications/Xcode.app',
            },
            {
              title: 'iOS Simulator',
              hasPassed: true,
              duration: '1.5s',
              message: 'iOS 17.2 Simulator available',
            },
            {
              title: 'CocoaPods',
              hasPassed: true,
              duration: '0.8s',
              message: 'CocoaPods 1.14.3 installed',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should handle typical Android setup check success', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          totalDuration: '6.5s',
          tests: [
            {
              title: 'Node.js Version',
              hasPassed: true,
              duration: '0.8s',
              message: 'Node.js v20.10.0 detected',
            },
            {
              title: 'Android SDK',
              hasPassed: true,
              duration: '2.5s',
              message: 'Android SDK 35.0.0 configured',
            },
            {
              title: 'Android Emulator',
              hasPassed: true,
              duration: '2.0s',
              message: 'Android Emulator available',
            },
            {
              title: 'Gradle',
              hasPassed: true,
              duration: '1.2s',
              message: 'Gradle 8.5 detected',
            },
          ],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should handle CI/CD environment without proper setup', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed: sf force lightning local setup');
      });

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Error executing platform check');
    });
  });

  describe('execute() - Multiple Invocations', () => {
    it('should handle multiple sequential invocations', () => {
      const mockOutput = JSON.stringify({
        outputContent: {
          hasMetAllRequirements: true,
          tests: [],
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const iosState = createTestState({ platform: 'iOS' });
      const androidState = createTestState({ platform: 'Android' });

      const result1 = node.execute(iosState);
      const result2 = node.execute(androidState);

      expect(result1.validPlatformSetup).toBe(true);
      expect(result2.validPlatformSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it('should maintain independent state across invocations', () => {
      const state1 = createTestState({ platform: 'iOS' });

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      const result1 = node.execute(state1);
      expect(result1.validPlatformSetup).toBe(true);

      const state2 = createTestState({ platform: 'Android' });

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: false,
            tests: [
              {
                title: 'Test',
                hasPassed: false,
                message: 'Failed',
              },
            ],
          },
        })
      );

      const result2 = node.execute(state2);
      expect(result2.validPlatformSetup).toBe(false);

      // First state should not affect second
      expect(result1.validPlatformSetup).not.toBe(result2.validPlatformSetup);
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty tests array with hasMetAllRequirements true', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should handle empty tests array with hasMetAllRequirements false', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: false,
            tests: [],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      // When there are no failed tests but hasMetAllRequirements is false,
      // the error messages array is empty, which becomes undefined
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should handle very long error messages', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      const longMessage = 'Error: '.repeat(100) + 'Very long error message';

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: false,
            tests: [
              {
                title: 'Test',
                hasPassed: false,
                message: longMessage,
              },
            ],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages![0]).toContain(longMessage);
    });

    it('should handle special characters in error messages', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: false,
            tests: [
              {
                title: 'Test',
                hasPassed: false,
                message: 'Error: <>&"\'\n\t special characters',
              },
            ],
          },
        })
      );

      const result = node.execute(inputState);

      expect(result.validPlatformSetup).toBe(false);
      expect(result.workflowFatalErrorMessages![0]).toContain('special characters');
    });
  });

  describe('execute() - Command Timeout Configuration', () => {
    it('should set timeout to 20000ms', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(expect.any(String), {
        encoding: 'utf-8',
        timeout: 20000,
      });
    });
  });

  describe('execute() - Command Format', () => {
    it('should format command correctly for iOS', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(
        'sf force lightning local setup -p ios -l 17.0 --json',
        expect.any(Object)
      );
    });

    it('should format command correctly for Android', () => {
      const inputState = createTestState({
        platform: 'Android',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(
        'sf force lightning local setup -p android -l 35 --json',
        expect.any(Object)
      );
    });

    it('should use lowercase platform name in command', () => {
      const inputState = createTestState({
        platform: 'iOS',
      });

      mockExecSync.mockReturnValue(
        JSON.stringify({
          outputContent: {
            hasMetAllRequirements: true,
            tests: [],
          },
        })
      );

      node.execute(inputState);

      // Verify lowercase 'ios' not 'iOS'
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('-p ios'),
        expect.any(Object)
      );
    });
  });
});

