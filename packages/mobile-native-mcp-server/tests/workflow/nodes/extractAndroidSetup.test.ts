/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtractAndroidSetupNode } from '../../../src/workflow/nodes/extractAndroidSetup.js';
import { createTestState } from '../../utils/stateBuilders.js';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

// Mock the envConfig module
const mockSaveEnvVarsToFile = vi.fn();
vi.mock('../../../src/workflow/utils/envConfig.js', () => ({
  saveEnvVarsToFile: mockSaveEnvVarsToFile,
}));

// Mock the createUserInputExtractionNode
vi.mock('@salesforce/magen-mcp-workflow', async () => {
  const actual = await vi.importActual('@salesforce/magen-mcp-workflow');
  return {
    ...actual,
    createUserInputExtractionNode: vi.fn(() => ({
      name: 'MockExtractionNode',
      execute: vi.fn(),
    })),
  };
});

// Type helper for accessing private properties in tests
type NodeWithBaseExtract = ExtractAndroidSetupNode & {
  baseExtractNode: {
    execute: ReturnType<typeof vi.fn>;
  };
};

describe('ExtractAndroidSetupNode', () => {
  let node: ExtractAndroidSetupNode;
  let mockExistsSync: ReturnType<typeof vi.fn>;
  let originalAndroidHome: string | undefined;
  let originalJavaHome: string | undefined;

  beforeEach(async () => {
    // Save original env vars
    originalAndroidHome = process.env.ANDROID_HOME;
    originalJavaHome = process.env.JAVA_HOME;

    // Clear env vars
    delete process.env.ANDROID_HOME;
    delete process.env.JAVA_HOME;

    mockExistsSync = vi.mocked(fs.existsSync);
    mockExistsSync.mockReset();

    // Import after mocks are set up
    const { ExtractAndroidSetupNode: Node } =
      await import('../../../src/workflow/nodes/extractAndroidSetup.js');
    node = new Node();

    // Mock the base extraction node's execute method
    const mockExecute = vi.fn();
    (node as NodeWithBaseExtract).baseExtractNode.execute = mockExecute;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original env vars
    if (originalAndroidHome !== undefined) {
      process.env.ANDROID_HOME = originalAndroidHome;
    } else {
      delete process.env.ANDROID_HOME;
    }
    if (originalJavaHome !== undefined) {
      process.env.JAVA_HOME = originalJavaHome;
    } else {
      delete process.env.JAVA_HOME;
    }
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('ExtractAndroidSetupNode');
    });

    it('should create base extraction node', () => {
      expect((node as NodeWithBaseExtract).baseExtractNode).toBeDefined();
    });
  });

  describe('execute() - Both paths valid', () => {
    it('should set both environment variables when paths are valid', () => {
      const inputState = createTestState({
        userInput: 'androidHome=/valid/android javaHome=/valid/java',
      });

      // Mock base extraction to return extracted paths
      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/valid/android',
        javaHome: '/valid/java',
      });

      // Mock paths exist
      mockExistsSync.mockReturnValue(true);

      const result = node.execute(inputState);

      expect(process.env.ANDROID_HOME).toBe('/valid/android');
      expect(process.env.JAVA_HOME).toBe('/valid/java');
      expect(result.androidHome).toBe('/valid/android');
      expect(result.javaHome).toBe('/valid/java');
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should call saveEnvVarsToFile with both paths', async () => {
      const { saveEnvVarsToFile } = await import('../../../src/workflow/utils/envConfig.js');
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/valid/android',
        javaHome: '/valid/java',
      });

      mockExistsSync.mockReturnValue(true);

      node.execute(inputState);

      expect(saveEnvVarsToFile).toHaveBeenCalledWith(
        {
          ANDROID_HOME: '/valid/android',
          JAVA_HOME: '/valid/java',
        },
        expect.anything()
      );
    });
  });

  describe('execute() - Only ANDROID_HOME valid', () => {
    it('should set ANDROID_HOME when only it is valid', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/valid/android',
        javaHome: '/invalid/java',
      });

      mockExistsSync.mockReturnValueOnce(true); // android path exists
      mockExistsSync.mockReturnValueOnce(false); // java path doesn't exist

      const result = node.execute(inputState);

      expect(process.env.ANDROID_HOME).toBe('/valid/android');
      expect(process.env.JAVA_HOME).toBeUndefined();
      expect(result.androidHome).toBe('/valid/android');
      expect(result.javaHome).toBeUndefined();
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toContain(
        'JAVA_HOME path does not exist: /invalid/java'
      );
    });

    it('should save only ANDROID_HOME to file', async () => {
      const { saveEnvVarsToFile } = await import('../../../src/workflow/utils/envConfig.js');
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/valid/android',
        javaHome: '/invalid/java',
      });

      mockExistsSync.mockReturnValueOnce(true);
      mockExistsSync.mockReturnValueOnce(false);

      node.execute(inputState);

      expect(saveEnvVarsToFile).toHaveBeenCalledWith(
        {
          ANDROID_HOME: '/valid/android',
        },
        expect.anything()
      );
    });
  });

  describe('execute() - Only JAVA_HOME valid', () => {
    it('should set JAVA_HOME when only it is valid', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/invalid/android',
        javaHome: '/valid/java',
      });

      mockExistsSync.mockReturnValueOnce(false); // android path doesn't exist
      mockExistsSync.mockReturnValueOnce(true); // java path exists

      const result = node.execute(inputState);

      expect(process.env.ANDROID_HOME).toBeUndefined();
      expect(process.env.JAVA_HOME).toBe('/valid/java');
      expect(result.androidHome).toBeUndefined();
      expect(result.javaHome).toBe('/valid/java');
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toContain(
        'ANDROID_HOME path does not exist: /invalid/android'
      );
    });
  });

  describe('execute() - Both paths invalid', () => {
    it('should not set environment variables when both paths are invalid', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/invalid/android',
        javaHome: '/invalid/java',
      });

      mockExistsSync.mockReturnValue(false);

      const result = node.execute(inputState);

      expect(process.env.ANDROID_HOME).toBeUndefined();
      expect(process.env.JAVA_HOME).toBeUndefined();
      expect(result.androidHome).toBeUndefined();
      expect(result.javaHome).toBeUndefined();
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(2);
    });

    it('should include both error messages', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/invalid/android',
        javaHome: '/invalid/java',
      });

      mockExistsSync.mockReturnValue(false);

      const result = node.execute(inputState);

      expect(result.workflowFatalErrorMessages).toContain(
        'ANDROID_HOME path does not exist: /invalid/android'
      );
      expect(result.workflowFatalErrorMessages).toContain(
        'JAVA_HOME path does not exist: /invalid/java'
      );
    });

    it('should not call saveEnvVarsToFile when both paths are invalid', async () => {
      const { saveEnvVarsToFile } = await import('../../../src/workflow/utils/envConfig.js');
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/invalid/android',
        javaHome: '/invalid/java',
      });

      mockExistsSync.mockReturnValue(false);

      node.execute(inputState);

      expect(saveEnvVarsToFile).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Missing paths', () => {
    it('should handle missing ANDROID_HOME', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        javaHome: '/valid/java',
      });

      mockExistsSync.mockReturnValue(true);

      const result = node.execute(inputState);

      expect(result.androidHome).toBeUndefined();
      expect(result.workflowFatalErrorMessages).toContain('ANDROID_HOME was not provided');
    });

    it('should handle missing JAVA_HOME', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/valid/android',
      });

      mockExistsSync.mockReturnValue(true);

      const result = node.execute(inputState);

      expect(result.javaHome).toBeUndefined();
      expect(result.workflowFatalErrorMessages).toContain('JAVA_HOME was not provided');
    });

    it('should handle both paths missing', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({});

      const result = node.execute(inputState);

      expect(result.androidHome).toBeUndefined();
      expect(result.javaHome).toBeUndefined();
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(2);
      expect(result.workflowFatalErrorMessages).toContain('ANDROID_HOME was not provided');
      expect(result.workflowFatalErrorMessages).toContain('JAVA_HOME was not provided');
    });
  });

  describe('execute() - Error message accumulation', () => {
    it('should append to existing error messages', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/invalid/android',
        workflowFatalErrorMessages: ['Existing error'],
      });

      mockExistsSync.mockReturnValue(false);

      const result = node.execute(inputState);

      expect(result.workflowFatalErrorMessages).toContain('Existing error');
      expect(result.workflowFatalErrorMessages).toContain(
        'ANDROID_HOME path does not exist: /invalid/android'
      );
    });

    it('should handle undefined as missing', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: undefined,
        javaHome: undefined,
      });

      const result = node.execute(inputState);

      expect(result.workflowFatalErrorMessages).toContain('ANDROID_HOME was not provided');
      expect(result.workflowFatalErrorMessages).toContain('JAVA_HOME was not provided');
    });
  });

  describe('execute() - Pass-through behavior', () => {
    it('should pass through other properties from base extraction', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/valid/android',
        javaHome: '/valid/java',
        androidInstalled: true,
        someOtherProperty: 'value',
      });

      mockExistsSync.mockReturnValue(true);

      const result = node.execute(inputState);

      expect(result.androidInstalled).toBe(true);
      expect((result as unknown as { someOtherProperty: string }).someOtherProperty).toBe('value');
    });
  });

  describe('execute() - Edge cases', () => {
    it('should handle empty string paths', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '',
        javaHome: '',
      });

      const result = node.execute(inputState);

      expect(result.androidHome).toBeUndefined();
      expect(result.javaHome).toBeUndefined();
      expect(result.workflowFatalErrorMessages).toHaveLength(2);
    });

    it('should handle paths with spaces', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/path with spaces/android',
        javaHome: '/path with spaces/java',
      });

      mockExistsSync.mockReturnValue(true);

      node.execute(inputState);

      expect(process.env.ANDROID_HOME).toBe('/path with spaces/android');
      expect(process.env.JAVA_HOME).toBe('/path with spaces/java');
    });

    it('should handle paths with special characters', () => {
      const inputState = createTestState({});

      (node as NodeWithBaseExtract).baseExtractNode.execute = vi.fn().mockReturnValue({
        androidHome: '/path/to/android-sdk_r24',
        javaHome: '/path/to/java_17.0.1',
      });

      mockExistsSync.mockReturnValue(true);

      node.execute(inputState);

      expect(process.env.ANDROID_HOME).toBe('/path/to/android-sdk_r24');
      expect(process.env.JAVA_HOME).toBe('/path/to/java_17.0.1');
    });
  });
});
