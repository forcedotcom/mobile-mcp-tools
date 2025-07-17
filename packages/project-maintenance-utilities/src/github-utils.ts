import { GitHubServiceProvider, Release } from './services/index.js';
import type { Context as GitHubContext } from '@actions/github/lib/context';

interface ReleaseData {
  tagName: string;
  name: string;
  body: string;
  prerelease?: boolean;
  generateReleaseNotes?: boolean;
}

/**
 * GitHub utility functions that require GitHub API services
 */
export class GitHubUtils {
  constructor(private githubService: GitHubServiceProvider) {}

  /**
   * Check if a git tag exists
   * @param context - GitHub context
   * @param tagName - Tag name to check
   * @returns True if tag exists
   */
  async tagExists(context: GitHubContext, tagName: string): Promise<boolean> {
    return this.githubService.tagExists(context.repo.owner, context.repo.repo, tagName);
  }

  /**
   * Create a git tag
   * @param context - GitHub context
   * @param tagName - Tag name
   * @param message - Tag message
   * @param sha - Commit SHA to tag
   * @returns Created tag
   */
  async createTag(
    context: GitHubContext,
    tagName: string,
    message: string,
    sha: string
  ): Promise<void> {
    await this.githubService.createTag(context.repo.owner, context.repo.repo, tagName, sha);
  }

  /**
   * Check if a release exists
   * @param context - GitHub context
   * @param releaseTag - Release tag
   * @returns True if release exists
   */
  async releaseExists(context: GitHubContext, releaseTag: string): Promise<boolean> {
    return this.githubService.releaseExists(context.repo.owner, context.repo.repo, releaseTag);
  }

  /**
   * Get a release by tag
   * @param context - GitHub context
   * @param releaseTag - Release tag
   * @returns Release data
   * @throws Error with specific message if release doesn't exist
   */
  async getRelease(context: GitHubContext, releaseTag: string): Promise<Release> {
    return this.githubService.getRelease(context.repo.owner, context.repo.repo, releaseTag);
  }

  /**
   * Create a GitHub release
   * @param context - GitHub context
   * @param releaseData - Release configuration
   * @returns Created release
   */
  async createRelease(context: GitHubContext, releaseData: ReleaseData): Promise<Release> {
    return this.githubService.createRelease(
      context.repo.owner,
      context.repo.repo,
      releaseData.tagName,
      releaseData.name,
      releaseData.body,
      releaseData.prerelease || false,
      releaseData.generateReleaseNotes
    );
  }

  /**
   * Upload a release asset
   * @param context - GitHub context
   * @param releaseId - Release ID
   * @param assetName - Asset name
   * @param assetData - Asset data
   * @returns void
   * @throws Error with specific message if upload fails
   */
  async uploadReleaseAsset(
    context: GitHubContext,
    releaseId: number,
    assetName: string,
    assetData: Buffer
  ): Promise<void> {
    await this.githubService.uploadReleaseAsset(
      context.repo.owner,
      context.repo.repo,
      releaseId,
      assetName,
      assetData
    );
  }

  /**
   * Update a release
   * @param context - GitHub context
   * @param releaseId - Release ID
   * @param updateData - Update data
   * @returns void
   */
  async updateRelease(
    context: GitHubContext,
    releaseId: number,
    updateData: { prerelease?: boolean; draft?: boolean; name?: string; body?: string }
  ): Promise<void> {
    await this.githubService.updateRelease(
      context.repo.owner,
      context.repo.repo,
      releaseId,
      updateData
    );
  }

  /**
   * Download a release asset
   * @param context - GitHub context
   * @param assetId - Asset ID
   * @returns Asset data as Buffer
   * @throws Error with specific message if download fails
   */
  async downloadReleaseAsset(context: GitHubContext, assetId: number): Promise<Buffer> {
    return this.githubService.downloadReleaseAsset(context.repo.owner, context.repo.repo, assetId);
  }
}
