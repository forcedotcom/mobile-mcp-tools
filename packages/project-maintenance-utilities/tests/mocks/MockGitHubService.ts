import { GitHubServiceProvider, Release } from '../../src/services/interfaces/index.js';

interface MockReleaseData {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  prerelease: boolean;
  assets: Array<{
    id: number;
    name: string;
    browser_download_url: string;
  }>;
}

/**
 * Mock implementation of GitHubServiceProvider for testing
 * Stores essential data and creates mock Release objects as needed
 */
export class MockGitHubService implements GitHubServiceProvider {
  private releaseData: Map<string, MockReleaseData> = new Map();
  private tags: Set<string> = new Set();
  private assetData: Map<number, Buffer> = new Map();
  private shouldThrowOnOperation: Map<string, string> = new Map();

  async tagExists(owner: string, repo: string, tag: string): Promise<boolean> {
    const operationKey = `tagExists:${owner}/${repo}:${tag}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }
    return this.tags.has(tag);
  }

  async createTag(owner: string, repo: string, tag: string, sha: string): Promise<void> {
    const operationKey = `createTag:${owner}/${repo}:${tag}:${sha}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }
    this.tags.add(tag);
  }

  async releaseExists(owner: string, repo: string, tag: string): Promise<boolean> {
    const operationKey = `releaseExists:${owner}/${repo}:${tag}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }
    return this.releaseData.has(tag);
  }

  async getRelease(owner: string, repo: string, tag: string): Promise<Release> {
    const operationKey = `getRelease:${owner}/${repo}:${tag}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }

    const releaseData = this.releaseData.get(tag);
    if (!releaseData) {
      throw new Error(`Release not found: ${tag}`);
    }

    // Create a minimal Release object with required fields
    return {
      id: releaseData.id,
      tag_name: releaseData.tag_name,
      name: releaseData.name,
      body: releaseData.body,
      prerelease: releaseData.prerelease,
      assets: releaseData.assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        browser_download_url: asset.browser_download_url,
        // Add minimal required fields for Release asset type
        url: `https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`,
        node_id: `asset-${asset.id}`,
        label: null,
        state: 'uploaded' as const,
        content_type: 'application/octet-stream',
        size: 1024,
        download_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        uploader: null,
      })),
      // Add minimal required fields for Release type
      url: `https://api.github.com/repos/${owner}/${repo}/releases/${releaseData.id}`,
      html_url: `https://github.com/${owner}/${repo}/releases/tag/${releaseData.tag_name}`,
      assets_url: `https://api.github.com/repos/${owner}/${repo}/releases/${releaseData.id}/assets`,
      upload_url: `https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseData.id}/assets`,
      tarball_url: `https://api.github.com/repos/${owner}/${repo}/tarball/${releaseData.tag_name}`,
      zipball_url: `https://api.github.com/repos/${owner}/${repo}/zipball/${releaseData.tag_name}`,
      node_id: `release-${releaseData.id}`,
      target_commitish: 'main',
      draft: false,
      author: {
        login: 'test-user',
        id: 1,
        node_id: 'user-1',
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
        gravatar_id: '',
        url: 'https://api.github.com/users/test-user',
        html_url: 'https://github.com/test-user',
        followers_url: 'https://api.github.com/users/test-user/followers',
        following_url: 'https://api.github.com/users/test-user/following{/other_user}',
        gists_url: 'https://api.github.com/users/test-user/gists{/gist_id}',
        starred_url: 'https://api.github.com/users/test-user/starred{/owner}{/repo}',
        subscriptions_url: 'https://api.github.com/users/test-user/subscriptions',
        organizations_url: 'https://api.github.com/users/test-user/orgs',
        repos_url: 'https://api.github.com/users/test-user/repos',
        events_url: 'https://api.github.com/users/test-user/events{/privacy}',
        received_events_url: 'https://api.github.com/users/test-user/received_events',
        type: 'User',
        site_admin: false,
      },
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    } as Release;
  }

  async createRelease(
    owner: string,
    repo: string,
    tag: string,
    name: string,
    body: string,
    prerelease: boolean,
    generateReleaseNotes?: boolean
  ): Promise<Release> {
    const operationKey = `createRelease:${owner}/${repo}:${tag}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }

    // If generateReleaseNotes is true, append some mock auto-generated content
    const finalBody = generateReleaseNotes
      ? `${body}\n\n## What's Changed\n* Mock auto-generated release notes content\n* Various improvements and bug fixes`
      : body;

    const releaseData: MockReleaseData = {
      id: Math.floor(Math.random() * 1000000),
      tag_name: tag,
      name,
      body: finalBody,
      prerelease,
      assets: [],
    };

    this.releaseData.set(tag, releaseData);
    return this.getRelease(owner, repo, tag);
  }

  async updateRelease(
    owner: string,
    repo: string,
    releaseId: number,
    updateData: { prerelease?: boolean }
  ): Promise<void> {
    const operationKey = `updateRelease:${owner}/${repo}:${releaseId}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }

    // Find release by ID
    const release = Array.from(this.releaseData.values()).find(r => r.id === releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    // Update release
    if (updateData.prerelease !== undefined) {
      release.prerelease = updateData.prerelease;
    }
  }

  async uploadReleaseAsset(
    owner: string,
    repo: string,
    releaseId: number,
    name: string,
    data: Buffer
  ): Promise<void> {
    const operationKey = `uploadReleaseAsset:${owner}/${repo}:${releaseId}:${name}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }

    // Find release by ID
    const release = Array.from(this.releaseData.values()).find(r => r.id === releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    // Create asset
    const assetId = Math.floor(Math.random() * 1000000);
    const asset = {
      id: assetId,
      name,
      browser_download_url: `https://github.com/${owner}/${repo}/releases/download/${release.tag_name}/${name}`,
    };

    release.assets.push(asset);
    this.assetData.set(assetId, data);
  }

  async downloadReleaseAsset(owner: string, repo: string, assetId: number): Promise<Buffer> {
    const operationKey = `downloadReleaseAsset:${owner}/${repo}:${assetId}`;
    if (this.shouldThrowOnOperation.has(operationKey)) {
      throw new Error(this.shouldThrowOnOperation.get(operationKey));
    }

    const data = this.assetData.get(assetId);
    if (!data) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    return data;
  }

  // Helper methods for testing
  setRelease(tag: string, release: Partial<MockReleaseData>): void {
    const fullRelease: MockReleaseData = {
      id: Math.floor(Math.random() * 1000000),
      tag_name: tag,
      name: release.name || tag,
      body: release.body || 'Test release',
      prerelease: release.prerelease || false,
      assets: release.assets || [],
      ...release,
    };
    this.releaseData.set(tag, fullRelease);
  }

  setTagExists(tag: string): void {
    this.tags.add(tag);
  }

  setAssetData(assetId: number, data: Buffer): void {
    this.assetData.set(assetId, data);
  }

  setOperationToThrow(operation: string, errorMessage: string): void {
    this.shouldThrowOnOperation.set(operation, errorMessage);
  }

  clear(): void {
    this.releaseData.clear();
    this.tags.clear();
    this.assetData.clear();
    this.shouldThrowOnOperation.clear();
  }

  getReleaseData(): Map<string, MockReleaseData> {
    return new Map(this.releaseData);
  }

  getTags(): Set<string> {
    return new Set(this.tags);
  }
}
