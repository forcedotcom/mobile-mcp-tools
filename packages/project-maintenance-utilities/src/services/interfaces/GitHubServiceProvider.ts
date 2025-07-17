import type { RestEndpointMethodTypes } from '@octokit/rest';

export type Release = RestEndpointMethodTypes['repos']['getReleaseByTag']['response']['data'];

/**
 * Interface for GitHub operations
 */
export interface GitHubServiceProvider {
  tagExists(owner: string, repo: string, tag: string): Promise<boolean>;
  createTag(owner: string, repo: string, tag: string, sha: string): Promise<void>;
  releaseExists(owner: string, repo: string, tag: string): Promise<boolean>;
  getRelease(owner: string, repo: string, tag: string): Promise<Release>;
  createRelease(
    owner: string,
    repo: string,
    tag: string,
    name: string,
    body: string,
    prerelease: boolean,
    generateReleaseNotes?: boolean
  ): Promise<Release>;
  uploadReleaseAsset(
    owner: string,
    repo: string,
    releaseId: number,
    name: string,
    data: Buffer
  ): Promise<void>;
  updateRelease(
    owner: string,
    repo: string,
    releaseId: number,
    updateData: { prerelease?: boolean }
  ): Promise<void>;
  downloadReleaseAsset(owner: string, repo: string, assetId: number): Promise<Buffer>;
}
