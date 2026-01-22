import { GitHubUtils } from './github-utils.js';
import { NpmUtils, type CleanupResult } from './npm-utils.js';
import { ActionsReporter } from './actions-reporter.js';
import type { Context as GitHubContext } from '@actions/github/lib/context';
import { join } from 'path';
import {
  FileSystemServiceProvider,
  ProcessServiceProvider,
  GitHubServiceProvider,
  ActionsServiceProvider,
  PackageServiceProvider,
  FileSystemService,
  ProcessService,
  GitHubService,
  ActionsService,
  PackageService,
} from './services/index.js';

interface CreateReleaseOptions {
  packagePath: string;
  packageDisplayName: string;
}

interface PublishReleaseOptions {
  packagePath: string;
  packageDisplayName: string;
  releaseTag: string;
  npmTag?: string;
  dryRun?: boolean;
}

/**
 * Release orchestrator that combines all utility modules with dependency injection
 */
export class ReleaseOrchestrator {
  private context: GitHubContext;
  private npmUtils: NpmUtils;
  private githubUtils: GitHubUtils;
  private reporter: ActionsReporter;
  private fsService: FileSystemServiceProvider;
  private packageService: PackageServiceProvider;
  private static readonly TEMP_RELEASE_DIR = 'temp-release';

  constructor(
    context: GitHubContext,
    fsService: FileSystemServiceProvider,
    processService: ProcessServiceProvider,
    githubService: GitHubServiceProvider,
    actionsService: ActionsServiceProvider,
    packageService: PackageServiceProvider
  ) {
    this.context = context;
    this.fsService = fsService;
    this.packageService = packageService;
    this.npmUtils = new NpmUtils(fsService, processService);
    this.githubUtils = new GitHubUtils(githubService);
    this.reporter = new ActionsReporter(actionsService);
  }

  /**
   * Create a release workflow
   * @param options - Release options
   */
  async createRelease(options: CreateReleaseOptions): Promise<void> {
    const packagePath = options.packagePath.trim();
    const packageDisplayName = options.packageDisplayName.trim();

    try {
      this.reporter.step('Getting package information');
      const packageInfo = this.packageService.getPackageInfo(packagePath);
      const releaseName = this.packageService.createReleaseName(
        packageDisplayName,
        packageInfo.version
      );

      this.reporter.packageInfo(packageInfo);

      // Set outputs for GitHub Actions
      this.reporter.setOutput('package_full_name', packageInfo.packageFullName);
      this.reporter.setOutput('version', packageInfo.version);
      this.reporter.setOutput('tag_name', packageInfo.tagName);
      this.reporter.setOutput('release_name', releaseName);

      this.reporter.step('Checking if tag already exists');
      if (await this.githubUtils.tagExists(this.context, packageInfo.tagName)) {
        this.reporter.setFailed(
          `Tag ${packageInfo.tagName} already exists. Please increment the version in package.json and try again.`
        );
        return;
      }
      this.reporter.success(`Tag ${packageInfo.tagName} is available`);

      this.reporter.step('Creating package tarball');
      // Resolve wildcard dependencies before packing
      const workspaceRoot = this.packageService.findWorkspaceRoot(packagePath);
      let resolveWildcards: ((pkgPath: string) => {
        originalContent: string;
        modifiedContent: string;
      }) | undefined;

      if (workspaceRoot) {
        this.reporter.info(`Found workspace root: ${workspaceRoot}`);
        resolveWildcards = (pkgPath: string) => {
          const result = this.packageService.resolveWildcardDependencies(pkgPath, workspaceRoot);
          if (result.modifiedContent !== result.originalContent) {
            // Parse to show what was resolved
            const originalJson = JSON.parse(result.originalContent);
            const modifiedJson = JSON.parse(result.modifiedContent);
            const resolved: string[] = [];
            
            if (originalJson.dependencies && modifiedJson.dependencies) {
              for (const [depName, depVersion] of Object.entries(originalJson.dependencies)) {
                if (depVersion === '*' && modifiedJson.dependencies[depName] !== '*') {
                  resolved.push(`${depName}: * -> ${modifiedJson.dependencies[depName]}`);
                }
              }
            }
            
            if (resolved.length > 0) {
              this.reporter.info(`Resolved wildcard dependencies: ${resolved.join(', ')}`);
            }
          }
          return result;
        };
      } else {
        this.reporter.warning(
          'Could not detect workspace root. Wildcard dependencies will not be resolved.'
        );
      }

      const tarballInfo = this.npmUtils.createTarball(packagePath, resolveWildcards);
      this.reporter.setOutput('tarball_name', tarballInfo.tarballName);
      this.reporter.setOutput('tarball_path', tarballInfo.tarballPath);
      this.reporter.success(`Created tarball: ${tarballInfo.tarballName}`);

      this.reporter.step('Creating git tag');
      await this.githubUtils.createTag(
        this.context,
        packageInfo.tagName,
        releaseName,
        this.context.sha
      );
      this.reporter.success(`Created and pushed tag: ${packageInfo.tagName}`);

      this.reporter.step('Creating GitHub release');
      const releaseNotes = `Release candidate for ${packageInfo.packageFullName} v${packageInfo.version}. Download the tarball, test thoroughly, then use the corresponding publish workflow to release to NPM.`;

      const release = await this.githubUtils.createRelease(this.context, {
        tagName: packageInfo.tagName,
        name: releaseName,
        body: releaseNotes,
        prerelease: true,
        generateReleaseNotes: true,
      });

      this.reporter.step('Uploading tarball as release asset');
      const tarballContent = this.fsService.readFileSync(tarballInfo.tarballPath);
      await this.githubUtils.uploadReleaseAsset(
        this.context,
        release.id,
        tarballInfo.tarballName,
        tarballContent
      );

      this.reporter.success(`Created GitHub release: ${packageInfo.tagName}`);

      // Output final information
      this.reporter.success('Release created successfully!');
      this.reporter.releaseInfo({
        packageFullName: packageInfo.packageFullName,
        version: packageInfo.version,
        tagName: packageInfo.tagName,
        tarballName: tarballInfo.tarballName,
      });

      const repository = this.context.repo.owner + '/' + this.context.repo.repo;
      this.reporter.links({
        'Release URL': `https://github.com/${repository}/releases/tag/${packageInfo.tagName}`,
      });

      this.reporter.nextSteps([
        'Download and test the package tarball from the release',
        `Once UAT is complete, use the '${packageDisplayName} - Publish Release' workflow`,
      ]);
    } catch (error) {
      this.reporter.setFailed(`Failed to create release: ${this.npmUtils.getErrorMessage(error)}`);
    }
  }

  /**
   * Publish a release workflow
   * @param options - Publish options
   */
  async publishRelease(options: PublishReleaseOptions): Promise<void> {
    const packagePath = options.packagePath.trim();
    const releaseTag = options.releaseTag.trim();
    const npmTag = (options.npmTag ?? 'latest').trim();
    const dryRun = options.dryRun ?? false;

    try {
      this.reporter.step('Validating inputs and release');

      // Parse release tag
      const { packageIdentifier, packageVersion } = this.packageService.parseReleaseTag(releaseTag);
      this.reporter.setOutput('package_identifier', packageIdentifier);
      this.reporter.setOutput('package_version', packageVersion);

      this.reporter.info(`Package Identifier: ${packageIdentifier}`);
      this.reporter.info(`Version: ${packageVersion}`);

      this.reporter.step('Getting package information');
      const packageInfo = this.packageService.validatePackageVersion(packagePath, packageVersion);
      this.reporter.setOutput('package_full_name', packageInfo.packageFullName);
      this.reporter.success('Package information validated');

      this.reporter.step('Checking if version already published');
      if (this.npmUtils.isVersionPublished(packageInfo.packageFullName, packageVersion)) {
        this.reporter.setFailed(
          `Cannot publish: Version ${packageVersion} already exists on NPM\nIf you need to republish, increment the version and create a new release`
        );
        return;
      }
      this.reporter.success(`Version ${packageVersion} is not yet published`);

      this.reporter.step('Downloading release assets');
      const release = await this.githubUtils.getRelease(this.context, releaseTag);

      // Generate expected tarball name based on package info
      const expectedTarballName = this.npmUtils.generateTarballName(
        packageInfo.packageFullName,
        packageVersion
      );
      this.reporter.info(`Looking for specific tarball: ${expectedTarballName}`);

      // Find the specific tarball asset by name
      const tarballAsset = release.assets.find(asset => asset.name === expectedTarballName);
      if (!tarballAsset) {
        this.reporter.setFailed(
          `Expected tarball '${expectedTarballName}' not found in release assets. Available assets: ${release.assets.map(a => a.name).join(', ')}`
        );
        return;
      }

      // Download the tarball
      const assetData = await this.githubUtils.downloadReleaseAsset(this.context, tarballAsset.id);

      // Create temp directory and save the tarball
      if (!this.fsService.existsSync(ReleaseOrchestrator.TEMP_RELEASE_DIR)) {
        this.fsService.mkdirSync(ReleaseOrchestrator.TEMP_RELEASE_DIR, { recursive: true });
      }

      const tarballPath = join(ReleaseOrchestrator.TEMP_RELEASE_DIR, tarballAsset.name);
      this.fsService.writeFileSync(tarballPath, assetData);
      this.reporter.exportVariable('TARBALL_PATH', tarballPath);
      this.reporter.success(`Downloaded tarball: ${tarballAsset.name}`);

      this.reporter.step('Verifying tarball contents');
      const verification = this.npmUtils.verifyTarball(tarballPath, packageVersion);
      if (!verification.verified) {
        this.reporter.setFailed(`Failed to verify tarball: ${verification.error}`);
        return;
      }
      this.reporter.success(`Tarball verified - version matches: ${verification.extractedVersion}`);

      this.reporter.step(`Publishing to NPM${dryRun ? ' (dry run)' : ''}`);
      if (dryRun) {
        this.reporter.info('🧪 DRY RUN MODE - Validating package but not publishing');
      }

      try {
        this.npmUtils.publishToNpm(tarballPath, npmTag, dryRun);
      } catch (error) {
        this.reporter.setFailed(
          `Failed to publish package: ${this.npmUtils.getErrorMessage(error)}`
        );
        return;
      }

      if (!dryRun) {
        this.reporter.step('Updating GitHub release');

        // Update release description for published package
        const publishedReleaseNotes = `✅ **Published to NPM**

${packageInfo.packageFullName} v${packageVersion} has been successfully published to NPM.

## Installation

\`\`\`bash
npm install ${packageInfo.packageFullName}@${packageVersion}
\`\`\`

## NPM Package
[View on NPM](https://www.npmjs.com/package/${packageInfo.packageFullName}/v/${packageVersion})

## What's Changed
See the automatically generated release notes below for details on changes in this version.`;

        await this.githubUtils.updateRelease(this.context, release.id, {
          prerelease: false,
          body: publishedReleaseNotes,
        });
        this.reporter.success('Release updated - marked as published with updated description');

        this.reporter.success('Package published successfully!');
        this.reporter.info('📋 Publication Details:');
        this.reporter.info(`  Package: ${packageInfo.packageFullName}`);
        this.reporter.info(`  Version: ${packageVersion}`);
        this.reporter.info(`  NPM Tag: ${npmTag}`);

        const repository = this.context.repo.owner + '/' + this.context.repo.repo;
        this.reporter.links({
          'NPM Package': `https://www.npmjs.com/package/${packageInfo.packageFullName}/v/${packageVersion}`,
          'GitHub Release': `https://github.com/${repository}/releases/tag/${releaseTag}`,
        });
      }
    } catch (error) {
      this.reporter.setFailed(`Failed to publish release: ${this.npmUtils.getErrorMessage(error)}`);
    } finally {
      const cleanupResults: CleanupResult[] = this.npmUtils.cleanup([
        ReleaseOrchestrator.TEMP_RELEASE_DIR,
      ]);
      cleanupResults.forEach(result => {
        if (result.success && result.existed) {
          this.reporter.info(`🧹 Cleaned up ${result.directory} directory`);
        } else if (!result.success) {
          this.reporter.warning(`Cleanup failed for ${result.directory}: ${result.error}`);
        }
      });
    }
  }
}

/**
 * Factory function to create ReleaseOrchestrator with default service implementations
 * Provides a convenient way to instantiate with concrete services
 */
export function createReleaseOrchestrator(context: GitHubContext): ReleaseOrchestrator {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const fileSystemService = new FileSystemService();
  const processService = new ProcessService();
  const gitHubService = new GitHubService(githubToken);
  const actionsService = new ActionsService();
  const packageService = new PackageService(fileSystemService);
  return new ReleaseOrchestrator(
    context,
    fileSystemService,
    processService,
    gitHubService,
    actionsService,
    packageService
  );
}
