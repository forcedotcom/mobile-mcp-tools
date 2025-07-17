import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubUtils } from '../src/github-utils.js';
import { MockGitHubService } from './mocks/index.js';
import { Context } from '@actions/github/lib/context';

describe('GitHubUtils', () => {
  let githubUtils: GitHubUtils;
  let mockGitHub: MockGitHubService;
  let mockContext: Context;

  beforeEach(() => {
    mockGitHub = new MockGitHubService();
    githubUtils = new GitHubUtils(mockGitHub);

    // Create a minimal mock context
    mockContext = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo',
      },
      sha: 'abc123def456',
    } as Context;
  });

  describe('tagExists', () => {
    it('should return true when tag exists', async () => {
      mockGitHub.setTagExists('v1.0.0');

      const result = await githubUtils.tagExists(mockContext, 'v1.0.0');

      expect(result).toBe(true);
    });

    it('should return false when tag does not exist', async () => {
      const result = await githubUtils.tagExists(mockContext, 'v1.0.0');

      expect(result).toBe(false);
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow('tagExists:test-owner/test-repo:v1.0.0', 'API Error');

      await expect(githubUtils.tagExists(mockContext, 'v1.0.0')).rejects.toThrow('API Error');
    });
  });

  describe('createTag', () => {
    it('should create tag successfully', async () => {
      await githubUtils.createTag(mockContext, 'v1.0.0', 'Release v1.0.0', 'abc123def456');

      expect(mockGitHub.getTags()).toContain('v1.0.0');
    });

    it('should handle GitHub API errors when creating tag', async () => {
      mockGitHub.setOperationToThrow(
        'createTag:test-owner/test-repo:v1.0.0:abc123def456',
        'Failed to create tag'
      );

      await expect(
        githubUtils.createTag(mockContext, 'v1.0.0', 'Release v1.0.0', 'abc123def456')
      ).rejects.toThrow('Failed to create tag');
    });
  });

  describe('releaseExists', () => {
    it('should return true when release exists', async () => {
      mockGitHub.setRelease('v1.0.0', {
        name: 'Release v1.0.0',
        body: 'Release notes',
      });

      const result = await githubUtils.releaseExists(mockContext, 'v1.0.0');

      expect(result).toBe(true);
    });

    it('should return false when release does not exist', async () => {
      const result = await githubUtils.releaseExists(mockContext, 'v1.0.0');

      expect(result).toBe(false);
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow('releaseExists:test-owner/test-repo:v1.0.0', 'API Error');

      await expect(githubUtils.releaseExists(mockContext, 'v1.0.0')).rejects.toThrow('API Error');
    });
  });

  describe('getRelease', () => {
    it('should get release successfully', async () => {
      const expectedRelease = {
        id: 123,
        name: 'Release v1.0.0',
        body: 'Release notes',
        prerelease: false,
        assets: [],
      };
      mockGitHub.setRelease('v1.0.0', expectedRelease);

      const result = await githubUtils.getRelease(mockContext, 'v1.0.0');

      expect(result.id).toBe(123);
      expect(result.name).toBe('Release v1.0.0');
      expect(result.body).toBe('Release notes');
      expect(result.prerelease).toBe(false);
    });

    it('should throw error when release not found', async () => {
      await expect(githubUtils.getRelease(mockContext, 'v1.0.0')).rejects.toThrow(
        'Release not found: v1.0.0'
      );
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow('getRelease:test-owner/test-repo:v1.0.0', 'API Error');

      await expect(githubUtils.getRelease(mockContext, 'v1.0.0')).rejects.toThrow('API Error');
    });
  });

  describe('createRelease', () => {
    it('should create release successfully', async () => {
      const releaseData = {
        tagName: 'v1.0.0',
        name: 'Release v1.0.0',
        body: 'Release notes',
        prerelease: true,
      };

      const result = await githubUtils.createRelease(mockContext, releaseData);

      expect(result.tag_name).toBe('v1.0.0');
      expect(result.name).toBe('Release v1.0.0');
      expect(result.body).toBe('Release notes');
      expect(result.prerelease).toBe(true);

      // Verify it was stored in mock
      const releases = mockGitHub.getReleaseData();
      expect(releases.has('v1.0.0')).toBe(true);
    });

    it('should create release with prerelease false by default', async () => {
      const releaseData = {
        tagName: 'v1.0.0',
        name: 'Release v1.0.0',
        body: 'Release notes',
      };

      const result = await githubUtils.createRelease(mockContext, releaseData);

      expect(result.prerelease).toBe(false);
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow(
        'createRelease:test-owner/test-repo:v1.0.0',
        'Failed to create release'
      );

      const releaseData = {
        tagName: 'v1.0.0',
        name: 'Release v1.0.0',
        body: 'Release notes',
      };

      await expect(githubUtils.createRelease(mockContext, releaseData)).rejects.toThrow(
        'Failed to create release'
      );
    });
  });

  describe('updateRelease', () => {
    it('should update release successfully', async () => {
      // Set up initial release
      mockGitHub.setRelease('v1.0.0', {
        id: 123,
        name: 'Release v1.0.0',
        body: 'Release notes',
        prerelease: true,
      });

      await githubUtils.updateRelease(mockContext, 123, { prerelease: false });

      // Verify the release was updated in the mock
      const releases = mockGitHub.getReleaseData();
      const release = releases.get('v1.0.0');
      expect(release?.prerelease).toBe(false);
    });

    it('should handle updating non-existent release', async () => {
      await expect(
        githubUtils.updateRelease(mockContext, 999, { prerelease: false })
      ).rejects.toThrow('Release not found: 999');
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow(
        'updateRelease:test-owner/test-repo:123',
        'Failed to update release'
      );

      await expect(
        githubUtils.updateRelease(mockContext, 123, { prerelease: false })
      ).rejects.toThrow('Failed to update release');
    });
  });

  describe('uploadReleaseAsset', () => {
    it('should upload asset successfully', async () => {
      // Set up initial release
      mockGitHub.setRelease('v1.0.0', {
        id: 123,
        name: 'Release v1.0.0',
        body: 'Release notes',
        prerelease: false,
      });

      const assetData = Buffer.from('test file content');

      await githubUtils.uploadReleaseAsset(mockContext, 123, 'test-file.txt', assetData);

      // Verify the asset was added to the release
      const releases = mockGitHub.getReleaseData();
      const release = releases.get('v1.0.0');
      expect(release?.assets).toHaveLength(1);
      expect(release?.assets[0].name).toBe('test-file.txt');
    });

    it('should handle uploading to non-existent release', async () => {
      const assetData = Buffer.from('test file content');

      await expect(
        githubUtils.uploadReleaseAsset(mockContext, 999, 'test-file.txt', assetData)
      ).rejects.toThrow('Release not found: 999');
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow(
        'uploadReleaseAsset:test-owner/test-repo:123:test-file.txt',
        'Failed to upload asset'
      );

      const assetData = Buffer.from('test file content');

      await expect(
        githubUtils.uploadReleaseAsset(mockContext, 123, 'test-file.txt', assetData)
      ).rejects.toThrow('Failed to upload asset');
    });
  });

  describe('downloadReleaseAsset', () => {
    it('should download asset successfully', async () => {
      const expectedData = Buffer.from('test file content');
      mockGitHub.setAssetData(456, expectedData);

      const result = await githubUtils.downloadReleaseAsset(mockContext, 456);

      expect(result).toEqual(expectedData);
    });

    it('should handle downloading non-existent asset', async () => {
      await expect(githubUtils.downloadReleaseAsset(mockContext, 999)).rejects.toThrow(
        'Asset not found: 999'
      );
    });

    it('should handle GitHub API errors', async () => {
      mockGitHub.setOperationToThrow(
        'downloadReleaseAsset:test-owner/test-repo:456',
        'Failed to download asset'
      );

      await expect(githubUtils.downloadReleaseAsset(mockContext, 456)).rejects.toThrow(
        'Failed to download asset'
      );
    });
  });
});
