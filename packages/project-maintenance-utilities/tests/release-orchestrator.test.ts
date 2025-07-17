import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, resolve, sep } from 'path';
import { Context } from '@actions/github/lib/context';
import { ReleaseOrchestrator, createReleaseOrchestrator } from '../src/release-orchestrator.js';
import {
  MockFileSystemService,
  MockProcessService,
  MockGitHubService,
  MockActionsService,
  MockPackageService,
} from './mocks/index.js';

describe('ReleaseOrchestrator', () => {
  let orchestrator: ReleaseOrchestrator;
  let mockContext: Context;
  let mockFs: MockFileSystemService;
  let mockProcess: MockProcessService;
  let mockGitHub: MockGitHubService;
  let mockActions: MockActionsService;
  let mockPackage: MockPackageService;

  beforeEach(() => {
    mockContext = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      sha: 'test-sha',
    } as Context;

    mockFs = new MockFileSystemService();
    mockProcess = new MockProcessService();
    mockGitHub = new MockGitHubService();
    mockActions = new MockActionsService();
    mockPackage = new MockPackageService();

    orchestrator = new ReleaseOrchestrator(
      mockContext,
      mockFs,
      mockProcess,
      mockGitHub,
      mockActions,
      mockPackage
    );
  });

  describe('createRelease', () => {
    it('should create a release successfully', async () => {
      // Setup package service
      mockPackage.setPackageInfo(join('.', 'test-package'), {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service
      mockGitHub.clear();

      // Setup process service for npm pack commands
      mockProcess.clear();
      mockProcess.setCommandResponse(
        'npm pack --dry-run --json',
        JSON.stringify([
          {
            filename: 'test-package-1.0.0.tgz',
            files: [{ path: 'package.json' }],
            size: 1024,
          },
        ])
      );
      mockProcess.setCommandResponse('npm pack', 'test-package-1.0.0.tgz');

      // Setup filesystem - make sure tarball will exist after npm pack
      // When createTarball changes directory to packagePath, it checks for just the filename
      mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball content');
      // Also set it at the full path for when it's read later (without ./ prefix)
      mockFs.setFileContent(join('test-package', 'test-package-1.0.0.tgz'), 'tarball content');

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
      };

      await orchestrator.createRelease(options);

      expect(mockActions.getOutput('package_full_name')).toBe('@test/package');
      expect(mockActions.getOutput('version')).toBe('1.0.0');
      expect(mockActions.getOutput('tag_name')).toBe('test-package_v1.0.0');
      expect(mockActions.getOutput('release_name')).toBe('Test Package v1.0.0');
      expect(mockActions.getInfoMessages()).toContain('✅ Release created successfully!');
    });

    it('should fail if tag already exists', async () => {
      // Setup package service
      mockPackage.setPackageInfo(join('.', 'test-package'), {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service to return that tag exists
      mockGitHub.setTagExists('test-package_v1.0.0');

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
      };

      await orchestrator.createRelease(options);

      expect(mockActions.getFailureMessage()).toBe(
        'Tag test-package_v1.0.0 already exists. Please increment the version in package.json and try again.'
      );
    });

    it('should handle errors gracefully', async () => {
      // Setup package service to throw error
      mockPackage.clear(); // No package info configured, so it will throw

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
      };

      await orchestrator.createRelease(options);

      expect(mockActions.getFailureMessage()).toBe(
        `Failed to create release: Mock: No package info configured for path: ${join('.', 'test-package')}`
      );
    });
  });

  describe('publishRelease', () => {
    it('should publish a release successfully', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service with a release
      mockGitHub.clear();
      mockGitHub.setRelease('test-package_v1.0.0', {
        id: 123,
        name: 'Test Package v1.0.0',
        body: 'Release notes',
        prerelease: true,
        assets: [
          {
            id: 456,
            name: 'test-package-1.0.0.tgz',
            browser_download_url: 'https://example.com/test-package-1.0.0.tgz',
          },
        ],
      });

      // Setup mock asset data
      mockGitHub.setAssetData(456, Buffer.from('tarball content'));

      // Setup process service for npm commands
      mockProcess.clear();
      // Mock npm view command to return empty (version not published)
      mockProcess.setCommandToThrow('npm view "@test/package@1.0.0" version', 'Version not found');
      // Mock npm publish command
      mockProcess.setCommandResponse(
        `npm publish "${resolve(join('temp-release', 'test-package-1.0.0.tgz'))}" --tag "latest"`,
        ''
      );
      // Mock tar commands for tarball verification
      mockProcess.setCommandResponse(
        `tar -tzf "${join('temp-release', 'test-package-1.0.0.tgz')}"`,
        'package/package.json\npackage/index.js'
      );
      mockProcess.setCommandResponse(
        `tar -xzf "${join('temp-release', 'test-package-1.0.0.tgz')}" -C "temp-verify"`,
        ''
      );

      // Setup filesystem to simulate temp directory creation
      mockFs.clear(); // Ensure temp directory doesn't exist initially
      // Mock the extracted package.json file
      mockFs.setFileContent(
        join('temp-verify', 'package', 'package.json'),
        JSON.stringify({
          name: '@test/package',
          version: '1.0.0',
        })
      );

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
        npmTag: 'latest',
        dryRun: false,
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getOutput('package_identifier')).toBe('test-package');
      expect(mockActions.getOutput('package_version')).toBe('1.0.0');
      expect(mockActions.getOutput('package_full_name')).toBe('@test/package');
      expect(mockActions.getInfoMessages()).toContain('✅ Package published successfully!');
    });

    it('should handle dry run mode', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service with a release
      mockGitHub.clear();
      mockGitHub.setRelease('test-package_v1.0.0', {
        id: 123,
        name: 'Test Package v1.0.0',
        body: 'Release notes',
        prerelease: true,
        assets: [
          {
            id: 456,
            name: 'test-package-1.0.0.tgz',
            browser_download_url: 'https://example.com/test-package-1.0.0.tgz',
          },
        ],
      });

      // Setup mock asset data
      mockGitHub.setAssetData(456, Buffer.from('tarball content'));

      // Setup process service for npm commands (dry run)
      mockProcess.clear();
      // Mock npm view command to return empty (version not published)
      mockProcess.setCommandToThrow('npm view "@test/package@1.0.0" version', 'Version not found');
      // Mock npm publish command with dry run
      mockProcess.setCommandResponse(
        `npm publish "${resolve(join('temp-release', 'test-package-1.0.0.tgz'))}" --tag "latest" --dry-run`,
        ''
      );
      // Mock tar commands for tarball verification
      mockProcess.setCommandResponse(
        `tar -tzf "${join('temp-release', 'test-package-1.0.0.tgz')}"`,
        'package/package.json\npackage/index.js'
      );
      mockProcess.setCommandResponse(
        `tar -xzf "${join('temp-release', 'test-package-1.0.0.tgz')}" -C "temp-verify"`,
        ''
      );

      // Setup filesystem to simulate temp directory creation
      mockFs.clear(); // Ensure temp directory doesn't exist initially
      // Mock the extracted package.json file
      mockFs.setFileContent(
        join('temp-verify', 'package', 'package.json'),
        JSON.stringify({
          name: '@test/package',
          version: '1.0.0',
        })
      );

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
        npmTag: 'latest',
        dryRun: true,
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getInfoMessages()).toContain(
        '🧪 DRY RUN MODE - Validating package but not publishing'
      );
    });

    it('should fail if expected tarball is not found', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service with a release but wrong tarball name
      mockGitHub.clear();
      mockGitHub.setRelease('test-package_v1.0.0', {
        id: 123,
        name: 'Test Package v1.0.0',
        body: 'Release notes',
        prerelease: true,
        assets: [
          {
            id: 456,
            name: 'different-package-1.0.0.tgz',
            browser_download_url: 'https://example.com/different-package-1.0.0.tgz',
          },
        ],
      });

      // Setup process service for npm commands
      mockProcess.clear();
      // Mock npm view command to return empty (version not published)
      mockProcess.setCommandToThrow('npm view "@test/package@1.0.0" version', 'Version not found');

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getFailureMessage()).toContain(
        "Expected tarball 'test-package-1.0.0.tgz' not found in release assets"
      );
    });

    it('should handle errors gracefully', async () => {
      // Setup package service to throw error
      mockPackage.clear(); // No release tag configured, so it will throw

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getFailureMessage()).toBe(
        'Failed to publish release: Mock: No release tag configured for: test-package_v1.0.0'
      );
    });

    it('should fail if version is already published on NPM', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup process service to return that version IS published
      mockProcess.clear();
      mockProcess.setCommandResponse('npm view "@test/package@1.0.0" version', '1.0.0');

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
        npmTag: 'latest',
        dryRun: false,
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getFailureMessage()).toBe(
        'Cannot publish: Version 1.0.0 already exists on NPM\nIf you need to republish, increment the version and create a new release'
      );
    });

    it('should fail if tarball verification fails', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service with a release
      mockGitHub.clear();
      mockGitHub.setRelease('test-package_v1.0.0', {
        id: 123,
        name: 'Test Package v1.0.0',
        body: 'Release notes',
        prerelease: true,
        assets: [
          {
            id: 456,
            name: 'test-package-1.0.0.tgz',
            browser_download_url: 'https://example.com/test-package-1.0.0.tgz',
          },
        ],
      });

      // Setup mock asset data
      mockGitHub.setAssetData(456, Buffer.from('tarball content'));

      // Setup process service - version not published, but tarball verification fails
      mockProcess.clear();
      mockProcess.setCommandToThrow('npm view "@test/package@1.0.0" version', 'Version not found');
      // Mock tar command to fail
      mockProcess.setCommandToThrow(
        `tar -tzf "${join('temp-release', 'test-package-1.0.0.tgz')}"`,
        'tar: Error reading archive'
      );

      // Setup filesystem
      mockFs.clear();

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
        npmTag: 'latest',
        dryRun: false,
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getFailureMessage()).toBe(
        'Failed to verify tarball: tar: Error reading archive'
      );
    });

    it('should fail if NPM publish command fails', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service with a release
      mockGitHub.clear();
      mockGitHub.setRelease('test-package_v1.0.0', {
        id: 123,
        name: 'Test Package v1.0.0',
        body: 'Release notes',
        prerelease: true,
        assets: [
          {
            id: 456,
            name: 'test-package-1.0.0.tgz',
            browser_download_url: 'https://example.com/test-package-1.0.0.tgz',
          },
        ],
      });

      // Setup mock asset data
      mockGitHub.setAssetData(456, Buffer.from('tarball content'));

      // Setup process service - all commands succeed except npm publish
      mockProcess.clear();
      mockProcess.setCommandToThrow('npm view "@test/package@1.0.0" version', 'Version not found');
      mockProcess.setCommandResponse(
        `tar -tzf "${join('temp-release', 'test-package-1.0.0.tgz')}"`,
        'package/package.json\npackage/index.js'
      );
      mockProcess.setCommandResponse(
        `tar -xzf "${join('temp-release', 'test-package-1.0.0.tgz')}" -C "temp-verify"`,
        ''
      );
      // Make npm publish fail
      mockProcess.setCommandToThrow(
        `npm publish "${resolve(join('temp-release', 'test-package-1.0.0.tgz'))}" --tag "latest"`,
        'npm ERR! 403 Forbidden'
      );

      // Setup filesystem
      mockFs.clear();
      mockFs.setFileContent(
        join('temp-verify', 'package', 'package.json'),
        JSON.stringify({
          name: '@test/package',
          version: '1.0.0',
        })
      );

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
        npmTag: 'latest',
        dryRun: false,
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getFailureMessage()).toBe(
        'Failed to publish package: Failed to publish package: npm ERR! 403 Forbidden'
      );
    });

    it('should warn if cleanup fails', async () => {
      // Setup package service
      mockPackage.setReleaseTag('test-package_v1.0.0', {
        packageIdentifier: 'test-package',
        packageVersion: '1.0.0',
      });

      mockPackage.setValidation(join('.', 'test-package'), '1.0.0', {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });

      // Setup GitHub service with a release
      mockGitHub.clear();
      mockGitHub.setRelease('test-package_v1.0.0', {
        id: 123,
        name: 'Test Package v1.0.0',
        body: 'Release notes',
        prerelease: true,
        assets: [
          {
            id: 456,
            name: 'test-package-1.0.0.tgz',
            browser_download_url: 'https://example.com/test-package-1.0.0.tgz',
          },
        ],
      });

      // Setup mock asset data
      mockGitHub.setAssetData(456, Buffer.from('tarball content'));

      // Setup process service for successful publish
      mockProcess.clear();
      mockProcess.setCommandToThrow('npm view "@test/package@1.0.0" version', 'Version not found');
      mockProcess.setCommandResponse(
        `tar -tzf "${join('temp-release', 'test-package-1.0.0.tgz')}"`,
        'package/package.json\npackage/index.js'
      );
      mockProcess.setCommandResponse(
        `tar -xzf "${join('temp-release', 'test-package-1.0.0.tgz')}" -C "temp-verify"`,
        ''
      );
      mockProcess.setCommandResponse(
        `npm publish "${resolve(join('temp-release', 'test-package-1.0.0.tgz'))}" --tag "latest"`,
        ''
      );

      // Setup filesystem to fail on cleanup (rmSync)
      mockFs.clear();
      mockFs.setFileContent(
        join('temp-verify', 'package', 'package.json'),
        JSON.stringify({
          name: '@test/package',
          version: '1.0.0',
        })
      );
      // Make the temp directory exist but fail to delete
      mockFs.setDirectoryExists('temp-release');
      mockFs.setOperationError('rmSync', new Error('Permission denied'));

      const options = {
        packagePath: join('.', 'test-package'),
        packageDisplayName: 'Test Package',
        releaseTag: 'test-package_v1.0.0',
        npmTag: 'latest',
        dryRun: false,
      };

      await orchestrator.publishRelease(options);

      expect(mockActions.getInfoMessages()).toContain('✅ Package published successfully!');
      expect(mockActions.getWarningMessages()).toContain(
        'Cleanup failed for temp-release: Permission denied'
      );
    });
  });

  describe('Input sanitization', () => {
    describe('createRelease', () => {
      it('should handle input strings with leading/trailing spaces', async () => {
        // Setup package service with trimmed path
        mockPackage.setPackageInfo(`.${sep}test-package`, {
          packageFullName: '@test/package',
          version: '1.0.0',
          tagName: 'test-package_v1.0.0',
          tagPrefix: 'test-package',
        });

        // Setup GitHub service
        mockGitHub.clear();

        // Setup process service for npm pack commands
        mockProcess.clear();
        mockProcess.setCommandResponse(
          'npm pack --dry-run --json',
          JSON.stringify([
            {
              filename: 'test-package-1.0.0.tgz',
              files: [{ path: 'package.json' }],
              size: 1024,
            },
          ])
        );
        mockProcess.setCommandResponse('npm pack', 'test-package-1.0.0.tgz');

        // Setup filesystem
        mockFs.clear();
        mockFs.setFileContent('test-package-1.0.0.tgz', 'tarball content');
        mockFs.setFileContent(join('test-package', 'test-package-1.0.0.tgz'), 'tarball content');

        // Test with inputs that have leading/trailing spaces
        const options = {
          packagePath: `  .${sep}test-package  `,
          packageDisplayName: '  Test Package  ',
        };

        await orchestrator.createRelease(options);

        // Should succeed despite the spaces in input
        expect(mockActions.getOutput('package_full_name')).toBe('@test/package');
        expect(mockActions.getOutput('version')).toBe('1.0.0');
        expect(mockActions.getOutput('tag_name')).toBe('test-package_v1.0.0');
        expect(mockActions.getOutput('release_name')).toBe('Test Package v1.0.0');
        expect(mockActions.getInfoMessages()).toContain('✅ Release created successfully!');
      });
    });

    describe('publishRelease', () => {
      it('should handle input strings with leading/trailing spaces', async () => {
        // Setup package service
        mockPackage.setReleaseTag('test-package_v1.0.0', {
          packageIdentifier: 'test-package',
          packageVersion: '1.0.0',
        });

        mockPackage.setValidation(`.${sep}test-package`, '1.0.0', {
          packageFullName: '@test/package',
          version: '1.0.0',
          tagName: 'test-package_v1.0.0',
          tagPrefix: 'test-package',
        });

        // Setup GitHub service with a release
        mockGitHub.clear();
        mockGitHub.setRelease('test-package_v1.0.0', {
          id: 123,
          name: 'Test Package v1.0.0',
          body: 'Release notes',
          prerelease: true,
          assets: [
            {
              id: 456,
              name: 'test-package-1.0.0.tgz',
              browser_download_url: 'https://example.com/test-package-1.0.0.tgz',
            },
          ],
        });

        // Setup mock asset data
        mockGitHub.setAssetData(456, Buffer.from('tarball content'));

        // Setup process service - all commands succeed
        mockProcess.clear();
        mockProcess.setCommandToThrow(
          'npm view "@test/package@1.0.0" version',
          'Version not found'
        );
        mockProcess.setCommandResponse(
          `tar -tzf "${join('temp-release', 'test-package-1.0.0.tgz')}"`,
          'package/package.json\npackage/index.js'
        );
        mockProcess.setCommandResponse(
          `tar -xzf "${join('temp-release', 'test-package-1.0.0.tgz')}" -C "temp-verify"`,
          ''
        );
        mockProcess.setCommandResponse(
          `npm publish "${resolve(join('temp-release', 'test-package-1.0.0.tgz'))}" --tag "latest"`,
          'published'
        );

        // Setup filesystem
        mockFs.clear();
        mockFs.setFileContent(
          join('temp-verify', 'package', 'package.json'),
          '{"version": "1.0.0"}'
        );

        // Test with inputs that have leading/trailing spaces
        const options = {
          packagePath: `  .${sep}test-package  `,
          packageDisplayName: '  Test Package  ',
          releaseTag: '  test-package_v1.0.0  ',
          npmTag: '  latest  ',
          dryRun: false,
        };

        await orchestrator.publishRelease(options);

        // Should succeed despite the spaces in input
        expect(mockActions.getInfoMessages()).toContain('✅ Package published successfully!');
        expect(mockActions.getOutput('package_identifier')).toBe('test-package');
        expect(mockActions.getOutput('package_version')).toBe('1.0.0');
        expect(mockActions.getOutput('package_full_name')).toBe('@test/package');
      });
    });
  });

  describe('createReleaseOrchestrator factory', () => {
    const originalGitHubToken = process.env.GITHUB_TOKEN;
    const mockContext = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      sha: 'test-sha',
    } as Context;

    afterEach(() => {
      // Restore original environment
      if (originalGitHubToken) {
        process.env.GITHUB_TOKEN = originalGitHubToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
    });

    it('should create ReleaseOrchestrator with concrete services when GITHUB_TOKEN is set', () => {
      process.env.GITHUB_TOKEN = 'test-token';

      const orchestrator = createReleaseOrchestrator(mockContext);

      expect(orchestrator).toBeInstanceOf(ReleaseOrchestrator);
    });

    it('should throw error when GITHUB_TOKEN is not set', () => {
      delete process.env.GITHUB_TOKEN;

      expect(() => createReleaseOrchestrator(mockContext)).toThrow(
        'GITHUB_TOKEN environment variable is required'
      );
    });
  });
});
