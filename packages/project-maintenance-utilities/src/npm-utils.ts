import { FileSystemServiceProvider, ProcessServiceProvider } from './services/index.js';
import { join, resolve } from 'path';

interface TarballInfo {
  tarballName: string;
  tarballPath: string;
}

/**
 * Essential package.json structure for verification
 */
interface PackageJsonInfo {
  name: string;
  version: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown; // Allow additional properties
}

interface VerificationResult {
  verified: boolean;
  files?: string[];
  extractedVersion?: string;
  packageJson?: PackageJsonInfo;
  error?: string;
}

export interface CleanupResult {
  directory: string;
  success: boolean;
  existed: boolean;
  error?: string;
}

/**
 * NPM utility functions that require file system and process services
 */
export class NpmUtils {
  constructor(
    private fsService: FileSystemServiceProvider,
    private processService: ProcessServiceProvider
  ) {}

  /**
   * Generate expected NPM tarball name from package info
   * NPM follows predictable naming: @scope/package-name becomes scope-package-name-version.tgz
   * @param packageName - Full package name (e.g., @salesforce/mobile-web-mcp-server)
   * @param version - Package version (e.g., 1.0.0)
   * @returns Expected tarball filename
   */
  generateTarballName(packageName: string, version: string): string {
    // Remove @scope/ prefix and replace slashes/@ with dashes, following npm pack naming
    const sanitizedName = packageName
      .replace(/^@/, '') // Remove leading @
      .replace(/\//g, '-'); // Replace / with -

    return `${sanitizedName}-${version}.tgz`;
  }

  /**
   * Safely extract error message from unknown error object
   * @param error - Error object of unknown type
   * @returns Safe error message string
   */
  getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Create NPM package tarball
   * @param packagePath - Path to package directory
   * @returns Tarball information
   */
  createTarball(packagePath: string): TarballInfo {
    const originalCwd = this.processService.cwd();

    try {
      this.processService.chdir(packagePath);

      // Get tarball filename without creating it
      const dryRunOutput = this.processService.execSync('npm pack --dry-run --json', {
        stdio: 'pipe',
      });
      const packInfo = JSON.parse(dryRunOutput.toString('utf8'));
      const tarballName = packInfo[0].filename;

      // Create the actual tarball
      this.processService.execSync('npm pack', { stdio: 'inherit' });

      // Verify tarball was created
      if (!this.fsService.existsSync(tarballName)) {
        throw new Error(`Tarball not created: ${tarballName}`);
      }

      const tarballPath = join(packagePath, tarballName);

      return {
        tarballName,
        tarballPath,
      };
    } finally {
      this.processService.chdir(originalCwd);
    }
  }

  /**
   * Check if a package version is already published to NPM
   * @param packageName - Full package name
   * @param version - Package version
   * @returns True if already published
   */
  isVersionPublished(packageName: string, version: string): boolean {
    try {
      // Check if this version is already published
      this.processService.execSync(`npm view "${packageName}@${version}" version`, {
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Publish package to NPM
   * @param tarballPath - Path to tarball
   * @param npmTag - NPM tag (e.g., 'latest', 'beta')
   * @param dryRun - Whether to perform a dry run
   * @throws Error with descriptive message if publish fails
   */
  publishToNpm(tarballPath: string, npmTag = 'latest', dryRun = false): void {
    const dryRunFlag = dryRun ? '--dry-run' : '';

    // Resolve to absolute path to prevent npm from interpreting as git repository URL
    const absoluteTarballPath = resolve(tarballPath);

    try {
      this.processService.execSync(
        `npm publish "${absoluteTarballPath}" --tag "${npmTag}" ${dryRunFlag}`.trim(),
        {
          stdio: 'inherit',
        }
      );
    } catch (error) {
      throw new Error(
        `Failed to ${dryRun ? 'validate' : 'publish'} package: ${this.getErrorMessage(error)}`
      );
    }
  }

  /**
   * Verify tarball contents
   * @param tarballPath - Path to tarball
   * @param expectedVersion - Expected version in package.json
   * @param tempDir - Temporary directory for extraction
   * @param autoCleanup - Whether to automatically clean up temp directory after verification
   * @returns Verification results
   */
  verifyTarball(
    tarballPath: string,
    expectedVersion: string,
    tempDir = join('.', 'temp-verify'),
    autoCleanup = true
  ): VerificationResult {
    try {
      // Show tarball contents (first 20 files)
      const contents = this.processService.execSync(`tar -tzf "${tarballPath}"`, { stdio: 'pipe' });
      const files = contents
        .toString('utf8')
        .split('\n')
        .slice(0, 20)
        .filter(file => file);

      // Extract to temporary directory for verification
      if (!this.fsService.existsSync(tempDir)) {
        this.fsService.mkdirSync(tempDir, { recursive: true });
      }

      this.processService.execSync(`tar -xzf "${tarballPath}" -C "${tempDir}"`, { stdio: 'pipe' });

      // Verify package.json exists and version matches
      const extractedPackageJsonPath = join(tempDir, 'package', 'package.json');
      if (!this.fsService.existsSync(extractedPackageJsonPath)) {
        throw new Error('package.json not found in extracted tarball');
      }

      const extractedPackageJson = JSON.parse(
        this.fsService.readFileSync(extractedPackageJsonPath, 'utf8')
      ) as PackageJsonInfo;
      const extractedVersion = extractedPackageJson.version;

      if (extractedVersion !== expectedVersion) {
        throw new Error(
          `Version mismatch in tarball:\n  Expected: ${expectedVersion}\n  Found: ${extractedVersion}`
        );
      }

      const result = {
        verified: true,
        files,
        extractedVersion,
        packageJson: extractedPackageJson,
      };

      // Clean up temp directory if requested
      if (autoCleanup) {
        this.cleanupDirectory(tempDir);
      }

      return result;
    } catch (error) {
      // Clean up temp directory even on error if requested
      if (autoCleanup) {
        this.cleanupDirectory(tempDir);
      }

      return {
        verified: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Clean up a single directory
   * @param directory - Directory to clean up
   * @returns Cleanup result
   */
  private cleanupDirectory(directory: string): CleanupResult {
    const existed = this.fsService.existsSync(directory);

    try {
      if (existed) {
        this.fsService.rmSync(directory, { recursive: true, force: true });
      }

      return {
        directory,
        success: true,
        existed,
      };
    } catch (error) {
      return {
        directory,
        success: false,
        existed,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Clean up temporary directories
   * @param directories - Directories to clean up
   * @returns Array of cleanup results
   */
  cleanup(directories: string[]): CleanupResult[] {
    return directories.map(dir => this.cleanupDirectory(dir));
  }
}
