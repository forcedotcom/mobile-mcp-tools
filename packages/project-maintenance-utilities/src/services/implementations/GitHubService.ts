import { Octokit } from '@octokit/rest';
import { GitHubServiceProvider, Release } from '../interfaces/GitHubServiceProvider.js';

/**
 * Concrete implementation of GitHubServiceProvider using Octokit
 */
export class GitHubService implements GitHubServiceProvider {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async tagExists(owner: string, repo: string, tag: string): Promise<boolean> {
    try {
      await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `tags/${tag}`,
      });
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async createTag(owner: string, repo: string, tag: string, sha: string): Promise<void> {
    await this.octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/tags/${tag}`,
      sha,
    });
  }

  async releaseExists(owner: string, repo: string, tag: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag,
      });
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async getRelease(owner: string, repo: string, tag: string): Promise<Release> {
    const response = await this.octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag,
    });
    return response.data;
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
    const response = await this.octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name,
      body,
      prerelease,
      generate_release_notes: generateReleaseNotes,
    });
    return response.data;
  }

  async uploadReleaseAsset(
    owner: string,
    repo: string,
    releaseId: number,
    name: string,
    data: Buffer
  ): Promise<void> {
    await this.octokit.rest.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: releaseId,
      name,
      // Octokit's TypeScript types are off for Buffer uploads. We cast data as string to satisfy
      // the type, but the API accepts Buffer for binary uploads.
      data: data as unknown as string,
    });
  }

  async updateRelease(
    owner: string,
    repo: string,
    releaseId: number,
    updateData: { prerelease?: boolean }
  ): Promise<void> {
    await this.octokit.rest.repos.updateRelease({
      owner,
      repo,
      release_id: releaseId,
      ...updateData,
    });
  }

  async downloadReleaseAsset(owner: string, repo: string, assetId: number): Promise<Buffer> {
    const response = await this.octokit.rest.repos.getReleaseAsset({
      owner,
      repo,
      asset_id: assetId,
      headers: {
        accept: 'application/octet-stream',
      },
    });
    return Buffer.from(response.data as unknown as ArrayBuffer);
  }

  /**
   * Type guard to check if error is a 404 Not Found error
   */
  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 404
    );
  }
}
