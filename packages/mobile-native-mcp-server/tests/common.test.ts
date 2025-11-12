/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { MOBILE_SDK_TEMPLATES_PATH, TempDirectoryManager } from '../src/common.js';
import { MockFileSystemOperations } from './utils/MockFileSystemProvider.js';

const mockTempDir = path.resolve('/mock/temp/dir');

describe('Common Module', () => {
  let manager: TempDirectoryManager;
  let mockFs: MockFileSystemOperations;

  beforeEach(() => {
    // Create a fresh mock filesystem and manager for each test
    mockFs = new MockFileSystemOperations(mockTempDir);
    manager = new TempDirectoryManager(mockFs);
  });

  describe('Constants', () => {
    it('should export MOBILE_SDK_TEMPLATES_PATH', () => {
      expect(MOBILE_SDK_TEMPLATES_PATH).toBeDefined();
      expect(typeof MOBILE_SDK_TEMPLATES_PATH).toBe('string');
      expect(MOBILE_SDK_TEMPLATES_PATH).toContain('templates');
    });
  });

  describe('TempDirectoryManager', () => {
    describe('manager.getTempWorkingDirectory()', () => {
      it('should return temp working directory', () => {
        const tempDir = manager.getTempWorkingDirectory();
        expect(tempDir).toBeDefined();
        expect(typeof tempDir).toBe('string');
        expect(tempDir).toContain(mockTempDir);
      });

      it('should return the same directory on multiple calls (singleton per instance)', () => {
        const dir1 = manager.getTempWorkingDirectory();
        const dir2 = manager.getTempWorkingDirectory();
        expect(dir1).toBe(dir2);
      });

      it('should create directory lazily (not in constructor)', () => {
        mockFs.reset();
        const newManager = new TempDirectoryManager(mockFs);

        // Directory should not be created yet
        // First call triggers creation
        const dir = newManager.getTempWorkingDirectory();
        expect(dir).toContain('magen-temp-');
      });
    });
  });

  describe('getIOSBuildOutputFilePath()', () => {
    it('should return iOS build output file path', () => {
      const path = manager.getIOSBuildOutputFilePath();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path).toContain('ios-app-build-output.txt');
      expect(path).toContain(mockTempDir);
    });

    it('should return consistent path', () => {
      const path1 = manager.getIOSBuildOutputFilePath();
      const path2 = manager.getIOSBuildOutputFilePath();
      expect(path1).toBe(path2);
    });
  });

  describe('getAndroidBuildOutputFilePath()', () => {
    it('should return Android build output file path', () => {
      const path = manager.getAndroidBuildOutputFilePath();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
      expect(path).toContain('android-app-build-output.txt');
      expect(path).toContain(mockTempDir);
    });

    it('should return consistent path', () => {
      const path1 = manager.getAndroidBuildOutputFilePath();
      const path2 = manager.getAndroidBuildOutputFilePath();
      expect(path1).toBe(path2);
    });

    it('should return different path than iOS', () => {
      const iosPath = manager.getIOSBuildOutputFilePath();
      const androidPath = manager.getAndroidBuildOutputFilePath();
      expect(iosPath).not.toBe(androidPath);
    });
  });

  describe('manager.getAppArtifactRootPath()', () => {
    it('should return path with project name', () => {
      const projectName = 'MyTestApp';
      const result = manager.getAppArtifactRootPath(projectName);

      expect(result).toBeDefined();
      expect(result).toContain(mockTempDir);
      expect(result).toContain(projectName);
    });

    it('should handle project names with spaces', () => {
      const projectName = 'My Test App';
      const result = manager.getAppArtifactRootPath(projectName);

      expect(result).toBeDefined();
      expect(result).toContain('My Test App');
    });

    it('should handle project names with special characters', () => {
      const projectName = 'MyApp-v2.0';
      const result = manager.getAppArtifactRootPath(projectName);

      expect(result).toBeDefined();
      expect(result).toContain('MyApp-v2.0');
    });

    it('should create platform-agnostic paths', () => {
      const projectName = 'TestApp';
      const result = manager.getAppArtifactRootPath(projectName);

      // Should contain the temp dir and project name, with proper path separators
      expect(result).toContain(mockTempDir);
      expect(result).toContain(projectName);
      expect(result.endsWith(projectName)).toBe(true);
    });

    it('should return different paths for different project names', () => {
      const project1 = manager.getAppArtifactRootPath('App1');
      const project2 = manager.getAppArtifactRootPath('App2');

      expect(project1).not.toBe(project2);
      expect(project1).toContain('App1');
      expect(project2).toContain('App2');
    });
  });

  describe('manager.getAppArtifactPath()', () => {
    describe('iOS Platform', () => {
      it('should return .app path for iOS', () => {
        const projectName = 'MyiOSApp';
        const result = manager.getAppArtifactPath(projectName, 'iOS');

        expect(result).toBeDefined();
        expect(result).toContain(`${projectName}.app`);
        expect(result).toContain(manager.getAppArtifactRootPath(projectName));
      });

      it('should construct correct full path for iOS', () => {
        const projectName = 'TestApp';
        const result = manager.getAppArtifactPath(projectName, 'iOS');

        // Should contain all the parts and end with the app bundle
        expect(result).toContain(mockTempDir);
        expect(result).toContain(projectName);
        expect(result.endsWith(`${projectName}.app`)).toBe(true);
      });

      it('should handle iOS project names with spaces', () => {
        const projectName = 'My iOS App';
        const result = manager.getAppArtifactPath(projectName, 'iOS');

        expect(result).toContain('My iOS App.app');
      });
    });

    describe('Android Platform', () => {
      it('should return .apk path for Android', () => {
        const projectName = 'MyAndroidApp';
        const result = manager.getAppArtifactPath(projectName, 'Android');

        expect(result).toBeDefined();
        expect(result).toContain(`${projectName}.apk`);
        expect(result).toContain(manager.getAppArtifactRootPath(projectName));
      });

      it('should construct correct full path for Android', () => {
        const projectName = 'TestApp';
        const result = manager.getAppArtifactPath(projectName, 'Android');

        // Should contain all the parts and end with the APK
        expect(result).toContain(mockTempDir);
        expect(result).toContain(projectName);
        expect(result.endsWith(`${projectName}.apk`)).toBe(true);
      });

      it('should handle Android project names with spaces', () => {
        const projectName = 'My Android App';
        const result = manager.getAppArtifactPath(projectName, 'Android');

        expect(result).toContain('My Android App.apk');
      });
    });

    describe('Platform Comparison', () => {
      it('should return different extensions for iOS vs Android', () => {
        const projectName = 'MultiPlatformApp';
        const iosPath = manager.getAppArtifactPath(projectName, 'iOS');
        const androidPath = manager.getAppArtifactPath(projectName, 'Android');

        expect(iosPath).toContain('.app');
        expect(iosPath).not.toContain('.apk');
        expect(androidPath).toContain('.apk');
        expect(androidPath).not.toContain('.app');
      });

      it('should use same root for both platforms', () => {
        const projectName = 'SharedProject';
        const iosPath = manager.getAppArtifactPath(projectName, 'iOS');
        const androidPath = manager.getAppArtifactPath(projectName, 'Android');
        const rootPath = manager.getAppArtifactRootPath(projectName);

        expect(iosPath).toContain(rootPath);
        expect(androidPath).toContain(rootPath);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty project name', () => {
        const result = manager.getAppArtifactPath('', 'iOS');

        expect(result).toBeDefined();
        expect(result).toContain('.app');
      });

      it('should handle project names with dots', () => {
        const projectName = 'com.example.app';
        const iosResult = manager.getAppArtifactPath(projectName, 'iOS');
        const androidResult = manager.getAppArtifactPath(projectName, 'Android');

        expect(iosResult).toContain('com.example.app.app');
        expect(androidResult).toContain('com.example.app.apk');
      });

      it('should handle project names with unicode characters', () => {
        const projectName = 'MyApp™';
        const result = manager.getAppArtifactPath(projectName, 'iOS');

        expect(result).toContain('MyApp™.app');
      });
    });
  });

  describe('Path Consistency', () => {
    it('should maintain path relationships between root and artifact paths', () => {
      const projectName = 'ConsistencyTest';
      const rootPath = manager.getAppArtifactRootPath(projectName);
      const iosArtifactPath = manager.getAppArtifactPath(projectName, 'iOS');
      const androidArtifactPath = manager.getAppArtifactPath(projectName, 'Android');

      // Artifact paths should start with root path
      expect(iosArtifactPath.startsWith(rootPath)).toBe(true);
      expect(androidArtifactPath.startsWith(rootPath)).toBe(true);
    });

    it('should use temp working directory as base for all paths', () => {
      const projectName = 'BasePathTest';
      const tempDir = manager.getTempWorkingDirectory();
      const rootPath = manager.getAppArtifactRootPath(projectName);
      const iosPath = manager.getAppArtifactPath(projectName, 'iOS');
      const androidPath = manager.getAppArtifactPath(projectName, 'Android');

      expect(rootPath.startsWith(tempDir)).toBe(true);
      expect(iosPath.startsWith(tempDir)).toBe(true);
      expect(androidPath.startsWith(tempDir)).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical iOS project name', () => {
      const projectName = 'SalesforceMobileApp';
      const artifactPath = manager.getAppArtifactPath(projectName, 'iOS');

      expect(artifactPath).toContain('SalesforceMobileApp.app');
      expect(artifactPath).toContain(mockTempDir);
    });

    it('should handle typical Android project name', () => {
      const projectName = 'SalesforceAndroidApp';
      const artifactPath = manager.getAppArtifactPath(projectName, 'Android');

      expect(artifactPath).toContain('SalesforceAndroidApp.apk');
      expect(artifactPath).toContain(mockTempDir);
    });

    it('should handle project name matching iOS conventions', () => {
      const projectName = 'MySwiftApp';
      const rootPath = manager.getAppArtifactRootPath(projectName);
      const artifactPath = manager.getAppArtifactPath(projectName, 'iOS');

      expect(rootPath).toContain('MySwiftApp');
      expect(artifactPath).toContain('MySwiftApp.app');
    });

    it('should handle project name matching Android conventions', () => {
      const projectName = 'MyKotlinApp';
      const rootPath = manager.getAppArtifactRootPath(projectName);
      const artifactPath = manager.getAppArtifactPath(projectName, 'Android');

      expect(rootPath).toContain('MyKotlinApp');
      expect(artifactPath).toContain('MyKotlinApp.apk');
    });
  });

  describe('Cleanup', () => {
    it('should call rmSync with correct path and options', () => {
      // First get the directory
      const dir = manager.getTempWorkingDirectory();

      // Clean it up
      manager.cleanup();

      // Verify rmSync was called with the correct arguments
      expect(mockFs.rmSyncCalls).toHaveLength(1);
      expect(mockFs.rmSyncCalls[0].path).toBe(dir);
      expect(mockFs.rmSyncCalls[0].options).toEqual({ recursive: true, force: true });
    });

    it('should not call rmSync when no directory has been created', () => {
      const freshManager = new TempDirectoryManager(mockFs);
      mockFs.reset(); // Clear any previous calls

      freshManager.cleanup();

      // Should not attempt to remove anything
      expect(mockFs.rmSyncCalls).toHaveLength(0);
    });

    it('should only call rmSync once even with multiple cleanup calls', () => {
      manager.getTempWorkingDirectory();
      mockFs.reset(); // Clear creation calls

      manager.cleanup();
      manager.cleanup();
      manager.cleanup();

      // Only the first cleanup should actually remove (subsequent ones have no directory to remove)
      expect(mockFs.rmSyncCalls).toHaveLength(1);
    });

    it('should allow recreation after cleanup', () => {
      const dir1 = manager.getTempWorkingDirectory();
      manager.cleanup();

      const dir2 = manager.getTempWorkingDirectory();

      // Should be a new directory
      expect(dir2).toBeDefined();
      expect(dir2).not.toBe(dir1);
    });
  });

  describe('Multiple Instances', () => {
    it('should allow independent temp directory managers', () => {
      const manager1 = new TempDirectoryManager(mockFs);
      const manager2 = new TempDirectoryManager(mockFs);

      const dir1 = manager1.getTempWorkingDirectory();
      const dir2 = manager2.getTempWorkingDirectory();

      // Different instances get different directories
      expect(dir1).not.toBe(dir2);
    });

    it('should not affect other instances when cleaning up', () => {
      const manager1 = new TempDirectoryManager(mockFs);
      const manager2 = new TempDirectoryManager(mockFs);

      manager1.getTempWorkingDirectory();
      const dir2 = manager2.getTempWorkingDirectory();

      // Clean up manager1
      manager1.cleanup();

      // manager2 should still work
      const dir2Again = manager2.getTempWorkingDirectory();
      expect(dir2Again).toBe(dir2);
    });
  });
});
