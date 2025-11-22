/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadEnvVarsFromFile,
  saveEnvVarsToFile,
  loadAndSetEnvVars,
} from '../../../src/workflow/utils/envConfig.js';
import { MockLogger } from '../../utils/MockLogger.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(),
}));

describe('envConfig utilities', () => {
  let mockExistsSync: ReturnType<typeof vi.fn>;
  let mockReadFileSync: ReturnType<typeof vi.fn>;
  let mockWriteFileSync: ReturnType<typeof vi.fn>;
  let mockMkdirSync: ReturnType<typeof vi.fn>;
  let mockHomedir: ReturnType<typeof vi.fn>;
  let originalAndroidHome: string | undefined;
  let originalJavaHome: string | undefined;

  beforeEach(() => {
    mockExistsSync = vi.mocked(fs.existsSync);
    mockReadFileSync = vi.mocked(fs.readFileSync);
    mockWriteFileSync = vi.mocked(fs.writeFileSync);
    mockMkdirSync = vi.mocked(fs.mkdirSync);
    mockHomedir = vi.mocked(os.homedir);

    // Save original env vars
    originalAndroidHome = process.env.ANDROID_HOME;
    originalJavaHome = process.env.JAVA_HOME;

    // Default mock values
    mockHomedir.mockReturnValue('/home/testuser');

    // Reset all mocks
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    mockMkdirSync.mockReset();
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

  describe('loadEnvVarsFromFile', () => {
    it('should return empty object if file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({});
      expect(mockExistsSync).toHaveBeenCalledWith(
        path.join('/home/testuser', '.magen', 'env_vars')
      );
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should parse simple key-value pairs', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/path/to/android\nJAVA_HOME=/path/to/java\n');

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({
        ANDROID_HOME: '/path/to/android',
        JAVA_HOME: '/path/to/java',
      });
    });

    it('should ignore empty lines', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        'ANDROID_HOME=/path/to/android\n\n\nJAVA_HOME=/path/to/java\n'
      );

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({
        ANDROID_HOME: '/path/to/android',
        JAVA_HOME: '/path/to/java',
      });
    });

    it('should ignore comment lines starting with #', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        '# This is a comment\nANDROID_HOME=/path/to/android\n# Another comment\nJAVA_HOME=/path/to/java\n'
      );

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({
        ANDROID_HOME: '/path/to/android',
        JAVA_HOME: '/path/to/java',
      });
    });

    it('should handle values containing equals signs', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('SOME_VAR=value=with=equals\n');

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({
        SOME_VAR: 'value=with=equals',
      });
    });

    it('should trim whitespace from keys', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('  ANDROID_HOME  =/path/to/android\n');

      const result = loadEnvVarsFromFile();

      expect(result).toHaveProperty('ANDROID_HOME');
      expect(result.ANDROID_HOME).toBe('/path/to/android');
    });

    it('should ignore lines without equals sign', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/path/to/android\nINVALID_LINE\n');

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({
        ANDROID_HOME: '/path/to/android',
      });
    });

    it('should throw error if file read fails', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => loadEnvVarsFromFile()).toThrow('Failed to read env config file');
    });

    it('should handle empty file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');

      const result = loadEnvVarsFromFile();

      expect(result).toEqual({});
    });
  });

  describe('saveEnvVarsToFile', () => {
    it('should create directory if it does not exist', () => {
      mockExistsSync.mockReturnValueOnce(false); // Directory doesn't exist
      mockExistsSync.mockReturnValueOnce(false); // env_vars file doesn't exist

      saveEnvVarsToFile({ ANDROID_HOME: '/path/to/android' });

      expect(mockMkdirSync).toHaveBeenCalledWith(path.join('/home/testuser', '.magen'), {
        recursive: true,
      });
    });

    it('should write new vars to empty file', () => {
      mockExistsSync.mockReturnValueOnce(true); // Directory exists
      mockExistsSync.mockReturnValueOnce(false); // env_vars file doesn't exist
      mockReadFileSync.mockReturnValue(''); // Empty file

      saveEnvVarsToFile({
        ANDROID_HOME: '/path/to/android',
        JAVA_HOME: '/path/to/java',
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join('/home/testuser', '.magen', 'env_vars'),
        'ANDROID_HOME=/path/to/android\nJAVA_HOME=/path/to/java\n',
        'utf-8'
      );
    });

    it('should merge with existing vars', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('EXISTING_VAR=/existing/path\n');

      saveEnvVarsToFile({ ANDROID_HOME: '/path/to/android' });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join('/home/testuser', '.magen', 'env_vars'),
        'EXISTING_VAR=/existing/path\nANDROID_HOME=/path/to/android\n',
        'utf-8'
      );
    });

    it('should override existing vars with same key', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/old/path\n');

      saveEnvVarsToFile({ ANDROID_HOME: '/new/path' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(writeCall[1]).toContain('ANDROID_HOME=/new/path');
      expect(writeCall[1]).not.toContain('/old/path');
    });

    it('should handle write errors gracefully with logger', () => {
      const mockLogger = new MockLogger();
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => saveEnvVarsToFile({ ANDROID_HOME: '/path' }, mockLogger)).not.toThrow();

      expect(mockLogger.hasLoggedMessage('Failed to save env vars to file', 'warn')).toBe(true);
    });

    it('should handle write errors gracefully without logger', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => saveEnvVarsToFile({ ANDROID_HOME: '/path' })).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save env vars to file')
      );
      consoleWarnSpy.mockRestore();
    });

    it('should handle mkdir errors gracefully', () => {
      const mockLogger = new MockLogger();
      mockExistsSync.mockReturnValue(false);
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => saveEnvVarsToFile({ ANDROID_HOME: '/path' }, mockLogger)).not.toThrow();
    });

    it('should preserve file format with trailing newline', () => {
      mockExistsSync.mockReturnValue(false);

      saveEnvVarsToFile({ TEST_VAR: '/test' });

      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(typeof writeCall[1]).toBe('string');
      expect((writeCall[1] as string).endsWith('\n')).toBe(true);
    });
  });

  describe('loadAndSetEnvVars', () => {
    it('should load and set ANDROID_HOME if path exists', () => {
      delete process.env.ANDROID_HOME;
      mockExistsSync.mockReturnValueOnce(true); // env_vars file exists
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/path/to/android\n');
      mockExistsSync.mockReturnValueOnce(true); // android path exists

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(true);
      expect(process.env.ANDROID_HOME).toBe('/path/to/android');
    });

    it('should load and set JAVA_HOME if path exists', () => {
      delete process.env.JAVA_HOME;
      mockExistsSync.mockReturnValueOnce(true); // env_vars file exists
      mockReadFileSync.mockReturnValue('JAVA_HOME=/path/to/java\n');
      mockExistsSync.mockReturnValueOnce(true); // java path exists

      const result = loadAndSetEnvVars();

      expect(result.javaHomeLoaded).toBe(true);
      expect(process.env.JAVA_HOME).toBe('/path/to/java');
    });

    it('should load both ANDROID_HOME and JAVA_HOME', () => {
      delete process.env.ANDROID_HOME;
      delete process.env.JAVA_HOME;
      mockExistsSync.mockReturnValueOnce(true); // env_vars file exists
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/path/to/android\nJAVA_HOME=/path/to/java\n');
      mockExistsSync.mockReturnValueOnce(true); // android path exists
      mockExistsSync.mockReturnValueOnce(true); // java path exists

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(true);
      expect(result.javaHomeLoaded).toBe(true);
      expect(process.env.ANDROID_HOME).toBe('/path/to/android');
      expect(process.env.JAVA_HOME).toBe('/path/to/java');
    });

    it('should not set ANDROID_HOME if path does not exist', () => {
      delete process.env.ANDROID_HOME;
      mockExistsSync.mockReturnValueOnce(true); // env_vars file exists
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/invalid/path\n');
      mockExistsSync.mockReturnValueOnce(false); // android path does not exist

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(false);
      expect(process.env.ANDROID_HOME).toBeUndefined();
    });

    it('should handle case-insensitive android_home', () => {
      delete process.env.ANDROID_HOME;
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValue('android_home=/path/to/android\n');
      mockExistsSync.mockReturnValueOnce(true);

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(true);
      expect(process.env.ANDROID_HOME).toBe('/path/to/android');
    });

    it('should handle case-insensitive java_home', () => {
      delete process.env.JAVA_HOME;
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValue('java_home=/path/to/java\n');
      mockExistsSync.mockReturnValueOnce(true);

      const result = loadAndSetEnvVars();

      expect(result.javaHomeLoaded).toBe(true);
      expect(process.env.JAVA_HOME).toBe('/path/to/java');
    });

    it('should prefer uppercase env var names', () => {
      delete process.env.ANDROID_HOME;
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/uppercase\nandroid_home=/lowercase\n');
      mockExistsSync.mockReturnValueOnce(true);

      loadAndSetEnvVars();

      expect(process.env.ANDROID_HOME).toBe('/uppercase');
    });

    it('should log debug messages with logger', () => {
      const mockLogger = new MockLogger();
      delete process.env.ANDROID_HOME;
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValue('ANDROID_HOME=/path/to/android\n');
      mockExistsSync.mockReturnValueOnce(true);

      loadAndSetEnvVars(mockLogger);

      expect(mockLogger.hasLoggedMessage('Loaded ANDROID_HOME from config', 'debug')).toBe(true);
    });

    it('should handle file read errors gracefully', () => {
      const mockLogger = new MockLogger();
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = loadAndSetEnvVars(mockLogger);

      expect(result.androidHomeLoaded).toBe(false);
      expect(result.javaHomeLoaded).toBe(false);
      expect(mockLogger.hasLoggedMessage('Failed to load env vars from config', 'warn')).toBe(true);
    });

    it('should return false for both if file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(false);
      expect(result.javaHomeLoaded).toBe(false);
    });

    it('should not set env var if not in file', () => {
      delete process.env.ANDROID_HOME;
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValue('SOME_OTHER_VAR=/path\n');

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(false);
      expect(process.env.ANDROID_HOME).toBeUndefined();
    });

    it('should handle empty file gracefully', () => {
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockReturnValue('');

      const result = loadAndSetEnvVars();

      expect(result.androidHomeLoaded).toBe(false);
      expect(result.javaHomeLoaded).toBe(false);
    });
  });
});
