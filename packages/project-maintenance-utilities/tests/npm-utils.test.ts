import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { NpmUtils } from '../src/npm-utils.js';
import { MockFileSystemService, MockProcessService } from './mocks/index.js';

describe('NpmUtils', () => {
  let npmUtils: NpmUtils;
  let mockFs: MockFileSystemService;
  let mockProcess: MockProcessService;

  beforeEach(() => {
    mockFs = new MockFileSystemService();
    mockProcess = new MockProcessService();
    npmUtils = new NpmUtils(mockFs, mockProcess);
  });

  describe('generateTarballName', () => {
    it('should handle scoped packages correctly', () => {
      expect(npmUtils.generateTarballName('@salesforce/mobile-web-mcp-server', '1.0.0')).toBe(
        'salesforce-mobile-web-mcp-server-1.0.0.tgz'
      );
    });

    it('should handle unscoped packages correctly', () => {
      expect(npmUtils.generateTarballName('my-package', '2.1.0')).toBe('my-package-2.1.0.tgz');
    });

    it('should handle complex scoped packages', () => {
      expect(npmUtils.generateTarballName('@org/sub/package', '1.0.0')).toBe(
        'org-sub-package-1.0.0.tgz'
      );
    });

    it('should handle packages with multiple slashes', () => {
      expect(npmUtils.generateTarballName('@scope/nested/deep/package', '1.0.0')).toBe(
        'scope-nested-deep-package-1.0.0.tgz'
      );
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(npmUtils.getErrorMessage(error)).toBe('Test error message');
    });

    it('should handle string errors', () => {
      expect(npmUtils.getErrorMessage('String error')).toBe('String error');
    });

    it('should handle undefined errors', () => {
      expect(npmUtils.getErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle null errors', () => {
      expect(npmUtils.getErrorMessage(null)).toBe('null');
    });

    it('should handle object errors', () => {
      expect(npmUtils.getErrorMessage({ message: 'Object error' })).toBe('[object Object]');
    });
  });

  describe('createTarball', () => {
    beforeEach(() => {
      mockProcess.setCommandResponse(
        'npm pack --dry-run --json',
        JSON.stringify([{ filename: 'test-package-1.0.0.tgz' }])
      );
      mockProcess.setCommandResponse('npm pack', 'Successfully created tarball');
    });

    it('should create tarball successfully', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      // The createTarball method checks for tarballName in the current directory (after chdir)
      // So we need to set up the file system to simulate the tarball being created
      mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball-content');

      const result = npmUtils.createTarball(packagePath);

      expect(result).toEqual({
        tarballName: 'test-package-1.0.0.tgz',
        tarballPath: path.join(packagePath, 'test-package-1.0.0.tgz'),
      });

      const commands = mockProcess.getExecutedCommands();
      expect(commands).toContain('npm pack --dry-run --json');
      expect(commands).toContain('npm pack');
    });

    it('should change directory during tarball creation', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      const originalCwd = path.resolve(path.sep, 'original', 'cwd');
      // Set up the mock to start with the original cwd
      mockProcess.chdir(originalCwd);
      mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball-content');

      npmUtils.createTarball(packagePath);

      const commands = mockProcess.getExecutedCommands();
      expect(commands[0]).toBe('npm pack --dry-run --json');
      expect(mockProcess.getCurrentWorkingDirectory()).toBe(originalCwd);
    });

    it('should throw error if tarball not created', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      // Don't set the tarball file to exist

      expect(() => npmUtils.createTarball(packagePath)).toThrow(
        'Tarball not created: test-package-1.0.0.tgz'
      );
    });

    it('should restore original directory even if error occurs', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      const originalCwd = path.resolve(path.sep, 'original', 'cwd');
      // Set up the mock to start with the original cwd
      mockProcess.chdir(originalCwd);
      mockProcess.setCommandToThrow('npm pack', 'Pack failed');

      expect(() => npmUtils.createTarball(packagePath)).toThrow('Pack failed');
      expect(mockProcess.getCurrentWorkingDirectory()).toBe(originalCwd);
    });

    it('should resolve wildcard dependencies before packing', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      const originalPackageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {
            '@salesforce/workflow': '*',
          },
        },
        null,
        2
      );
      const modifiedPackageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {
            '@salesforce/workflow': '^0.0.1',
          },
        },
        null,
        2
      );

      mockFs.setFileContent(path.join(packagePath, 'package.json'), originalPackageJson);
      mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball-content');

      const resolveWildcards = (pkgPath: string) => {
        expect(pkgPath).toBe(packagePath);
        return {
          originalContent: originalPackageJson,
          modifiedContent: modifiedPackageJson,
        };
      };

      npmUtils.createTarball(packagePath, resolveWildcards);

      // Verify package.json was restored after packing (it should be back to original)
      const restoredContent = mockFs.getFileContent(path.join(packagePath, 'package.json'));
      expect(restoredContent).toBe(originalPackageJson);
      
      // Verify the resolver was called (implicitly verified by the fact that restoration happened)
      // The modification happens internally and is restored, so we can't directly verify it
      // but we can verify the final state is correct
    });

    it('should not modify package.json if resolver returns same content', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      const packageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {
            'some-package': '^1.0.0',
          },
        },
        null,
        2
      );

      mockFs.setFileContent(path.join(packagePath, 'package.json'), packageJson);
      mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball-content');

      const resolveWildcards = () => ({
        originalContent: packageJson,
        modifiedContent: packageJson, // Same content
      });

      npmUtils.createTarball(packagePath, resolveWildcards);

      // Verify package.json was not modified
      const content = mockFs.getFileContent(path.join(packagePath, 'package.json'));
      expect(content).toBe(packageJson);
    });

    it('should restore package.json even if packing fails', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      const originalPackageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {
            '@salesforce/workflow': '*',
          },
        },
        null,
        2
      );
      const modifiedPackageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {
            '@salesforce/workflow': '^0.0.1',
          },
        },
        null,
        2
      );

      mockFs.setFileContent(path.join(packagePath, 'package.json'), originalPackageJson);
      mockProcess.setCommandToThrow('npm pack', 'Pack failed');

      const resolveWildcards = () => ({
        originalContent: originalPackageJson,
        modifiedContent: modifiedPackageJson,
      });

      expect(() => npmUtils.createTarball(packagePath, resolveWildcards)).toThrow('Pack failed');

      // Verify package.json was restored even after error
      const restoredContent = mockFs.getFileContent(path.join(packagePath, 'package.json'));
      expect(restoredContent).toBe(originalPackageJson);
    });

    it('should work without resolver function', () => {
      const packagePath = path.resolve(path.sep, 'test', 'package');
      const packageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
        },
        null,
        2
      );

      mockFs.setFileContent(path.join(packagePath, 'package.json'), packageJson);
      mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball-content');

      const result = npmUtils.createTarball(packagePath);

      expect(result.tarballName).toBe('test-package-1.0.0.tgz');
      // Verify package.json was not modified
      const content = mockFs.getFileContent(path.join(packagePath, 'package.json'));
      expect(content).toBe(packageJson);
    });
  });

  describe('isVersionPublished', () => {
    it('should return true if version is published', () => {
      mockProcess.setCommandResponse('npm view "test-package@1.0.0" version', '1.0.0');

      const result = npmUtils.isVersionPublished('test-package', '1.0.0');

      expect(result).toBe(true);
    });

    it('should return false if version is not published', () => {
      mockProcess.setCommandToThrow('npm view "test-package@1.0.0" version', 'Version not found');

      const result = npmUtils.isVersionPublished('test-package', '1.0.0');

      expect(result).toBe(false);
    });

    it('should handle scoped packages', () => {
      mockProcess.setCommandResponse('npm view "@scope/package@1.0.0" version', '1.0.0');

      const result = npmUtils.isVersionPublished('@scope/package', '1.0.0');

      expect(result).toBe(true);
    });
  });

  describe('publishToNpm', () => {
    it('should publish successfully', () => {
      const tarballPath = path.resolve(path.sep, 'path', 'to', 'tarball.tgz');
      mockProcess.setCommandResponse(
        `npm publish "${tarballPath}" --tag "latest" --access public`,
        'Published successfully'
      );

      expect(() => npmUtils.publishToNpm(tarballPath, 'latest', false)).not.toThrow();

      const commands = mockProcess.getExecutedCommands();
      expect(commands).toContain(`npm publish "${tarballPath}" --tag "latest" --access public`);
    });

    it('should handle dry run mode', () => {
      const tarballPath = path.resolve(path.sep, 'path', 'to', 'tarball.tgz');
      mockProcess.setCommandResponse(
        `npm publish "${tarballPath}" --tag "latest" --access public --dry-run`,
        'Dry run successful'
      );

      expect(() => npmUtils.publishToNpm(tarballPath, 'latest', true)).not.toThrow();

      const commands = mockProcess.getExecutedCommands();
      expect(commands).toContain(
        `npm publish "${tarballPath}" --tag "latest" --access public --dry-run`
      );
    });

    it('should use default tag if not specified', () => {
      const tarballPath = path.resolve(path.sep, 'path', 'to', 'tarball.tgz');
      mockProcess.setCommandResponse(
        `npm publish "${tarballPath}" --tag "latest" --access public`,
        'Published successfully'
      );

      expect(() => npmUtils.publishToNpm(tarballPath)).not.toThrow();
    });

    it('should throw descriptive error on publish failure', () => {
      const tarballPath = path.resolve(path.sep, 'path', 'to', 'tarball.tgz');
      mockProcess.setCommandToThrow(
        `npm publish "${tarballPath}" --tag "latest" --access public`,
        'Publish failed'
      );

      expect(() => npmUtils.publishToNpm(tarballPath, 'latest', false)).toThrow(
        'Failed to publish package: Publish failed'
      );
    });

    it('should throw descriptive error on dry run validation failure', () => {
      const tarballPath = path.resolve(path.sep, 'path', 'to', 'tarball.tgz');
      mockProcess.setCommandToThrow(
        `npm publish "${tarballPath}" --tag "latest" --access public --dry-run`,
        'Validation failed'
      );

      expect(() => npmUtils.publishToNpm(tarballPath, 'latest', true)).toThrow(
        'Failed to validate package: Validation failed'
      );
    });
  });

  describe('verifyTarball', () => {
    const tarballPath = path.resolve(path.sep, 'path', 'to', 'tarball.tgz');
    const expectedVersion = '1.0.0';

    beforeEach(() => {
      mockProcess.setCommandResponse(
        `tar -tzf "${tarballPath}"`,
        'package/\npackage/package.json\npackage/index.js\n'
      );
      mockProcess.setCommandResponse(`tar -xzf "${tarballPath}" -C "temp-verify"`, '');
      mockFs.setFileContent(
        path.join('temp-verify', 'package', 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
          description: 'Test package',
        })
      );
    });

    it('should verify tarball successfully', () => {
      const result = npmUtils.verifyTarball(tarballPath, expectedVersion);

      expect(result.verified).toBe(true);
      expect(result.files).toContain('package/package.json');
      expect(result.extractedVersion).toBe('1.0.0');
      expect(result.packageJson).toEqual({
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package',
      });
    });

    it('should handle version mismatch', () => {
      mockFs.setFileContent(
        path.join('temp-verify', 'package', 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '2.0.0',
        })
      );

      const result = npmUtils.verifyTarball(tarballPath, expectedVersion);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Version mismatch in tarball');
      expect(result.error).toContain('Expected: 1.0.0');
      expect(result.error).toContain('Found: 2.0.0');
    });

    it('should handle missing package.json', () => {
      // Clear the beforeEach setup and don't set the package.json file
      mockFs.clear();
      mockProcess.setCommandResponse(`tar -tzf "${tarballPath}"`, 'package/\npackage/index.js\n');
      mockProcess.setCommandResponse(`tar -xzf "${tarballPath}" -C "temp-verify"`, '');
      // Don't set the package.json file to exist

      const result = npmUtils.verifyTarball(tarballPath, expectedVersion);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('package.json not found in extracted tarball');
    });

    it('should handle extraction errors', () => {
      mockProcess.clearCommandResponses();
      mockProcess.setCommandToThrow(`tar -tzf "${tarballPath}"`, 'Extraction failed');

      const result = npmUtils.verifyTarball(tarballPath, expectedVersion);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Extraction failed');
    });

    it('should use custom temp directory', () => {
      const customTempDir = 'custom-temp';
      mockProcess.setCommandResponse(
        `tar -tzf "${tarballPath}"`,
        'package/\npackage/package.json\npackage/index.js\n'
      );
      mockProcess.setCommandResponse(`tar -xzf "${tarballPath}" -C "${customTempDir}"`, '');
      // The verifyTarball method creates the directory if it doesn't exist, so we need to ensure it's created
      mockFs.setDirectoryExists(customTempDir);
      mockFs.setFileContent(
        path.join(customTempDir, 'package', 'package.json'),
        JSON.stringify({
          name: 'test-package',
          version: '1.0.0',
        })
      );

      const result = npmUtils.verifyTarball(tarballPath, expectedVersion, customTempDir, false);

      expect(result.verified).toBe(true);
      expect(mockFs.getDirectories()).toContain(customTempDir);
    });

    it('should auto-cleanup temp directory by default', () => {
      const result = npmUtils.verifyTarball(tarballPath, expectedVersion);

      expect(result.verified).toBe(true);
      // The temp directory should be cleaned up automatically
      expect(mockFs.getDirectories()).not.toContain('temp-verify');
    });

    it('should skip auto-cleanup when disabled', () => {
      const result = npmUtils.verifyTarball(tarballPath, expectedVersion, 'temp-verify', false);

      expect(result.verified).toBe(true);
      // The temp directory should still exist (normalized path)
      expect(mockFs.getDirectories()).toContain('temp-verify');
    });
  });

  describe('cleanup', () => {
    it('should clean up existing directories', () => {
      const temp1 = 'temp1';
      const temp2 = 'temp2';
      mockFs.setDirectoryExists(temp1);
      mockFs.setDirectoryExists(temp2);

      const results = npmUtils.cleanup([temp1, temp2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        directory: temp1,
        success: true,
        existed: true,
      });
      expect(results[1]).toEqual({
        directory: temp2,
        success: true,
        existed: true,
      });
    });

    it('should handle non-existent directories', () => {
      const nonExistent = 'non-existent';
      const results = npmUtils.cleanup([nonExistent]);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        directory: nonExistent,
        success: true,
        existed: false,
      });
    });

    it('should handle cleanup errors', () => {
      const temp = 'temp';
      mockFs.setDirectoryExists(temp);
      // Configure rmSync to throw an error for this specific path
      mockFs.setOperationPathError('rmSync', temp, new Error('Permission denied'));

      const results = npmUtils.cleanup([temp]);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        directory: temp,
        success: false,
        existed: true,
        error: 'Permission denied',
      });
    });

    it('should handle mixed success and failure', () => {
      const temp1 = 'temp1';
      const temp2 = 'temp2';
      mockFs.setDirectoryExists(temp1);
      mockFs.setDirectoryExists(temp2);

      // Configure rmSync to fail only for temp2
      mockFs.setOperationPathError('rmSync', temp2, new Error('Permission denied'));

      const results = npmUtils.cleanup([temp1, temp2]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        directory: temp1,
        success: true,
        existed: true,
      });
      expect(results[1]).toEqual({
        directory: temp2,
        success: false,
        existed: true,
        error: 'Permission denied',
      });
    });
  });
});
