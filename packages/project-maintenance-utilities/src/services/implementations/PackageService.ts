import { join } from 'path';
import { valid as semverValid } from 'semver';
import { FileSystemServiceProvider } from '../interfaces/FileSystemServiceProvider.js';
import {
  PackageServiceProvider,
  PackageInfo,
  ParsedReleaseTag,
} from '../interfaces/PackageServiceProvider.js';

export class PackageService implements PackageServiceProvider {
  constructor(private fsService: FileSystemServiceProvider) {}

  /**
   * Get package information from package.json
   * @param packagePath - Path to package directory
   * @returns Package information
   */
  getPackageInfo(packagePath: string): PackageInfo {
    const packageJsonPath = join(packagePath, 'package.json');

    if (!this.fsService.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found at ${packageJsonPath}`);
    }

    const packageJsonContent = this.fsService.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    const packageFullName = packageJson.name;
    const version = packageJson.version;

    // Validate required fields
    if (!packageFullName || typeof packageFullName !== 'string') {
      throw new Error(
        `Invalid package.json: missing or invalid 'name' field at ${packageJsonPath}`
      );
    }

    if (!version || typeof version !== 'string') {
      throw new Error(
        `Invalid package.json: missing or invalid 'version' field at ${packageJsonPath}`
      );
    }

    // Create standardized names
    // Extract scope if present
    const scopePattern = /^@([^/]+)\//;
    const scopeMatch = packageFullName.match(scopePattern);
    const scope = scopeMatch ? scopeMatch[1] : null;

    // Remove @scope/ prefix and replace slashes with dashes for tag
    const baseName = packageFullName.replace(scopePattern, '').replace(/\//g, '-');

    // Create tag prefix with scope if present
    const tagPrefix = scope ? `${scope}-${baseName}` : baseName;
    const tagName = `${tagPrefix}_v${version}`;

    return {
      packageFullName,
      version,
      tagName,
      tagPrefix,
    };
  }

  /**
   * Create release name from display name and version
   * @param displayName - Package display name
   * @param version - Package version
   * @returns Release name
   */
  createReleaseName(displayName: string, version: string): string {
    return `${displayName} v${version}`;
  }

  /**
   * Parse release tag to extract package identifier and version
   * @param releaseTag - Release tag (format: package-name_vX.X.X where X.X.X is valid SemVer)
   * @returns Parsed tag information
   */
  parseReleaseTag(releaseTag: string): ParsedReleaseTag {
    const tagMatch = releaseTag.match(/^(.+)_v(.+)$/);
    if (!tagMatch) {
      throw new Error(
        `Invalid release tag format: ${releaseTag}. Expected format: <package-name>_v<semver-version>`
      );
    }

    const packageIdentifier = tagMatch[1];
    const packageVersion = tagMatch[2];

    // Validate that the version part is a valid SemVer version
    if (!semverValid(packageVersion)) {
      throw new Error(
        `Invalid SemVer version in release tag: ${releaseTag}. Version part "${packageVersion}" is not a valid SemVer version.`
      );
    }

    return {
      packageIdentifier,
      packageVersion,
    };
  }

  /**
   * Validate package version matches expected version
   * @param packagePath - Path to package directory
   * @param expectedVersion - Expected version
   * @returns Package information if valid
   */
  validatePackageVersion(packagePath: string, expectedVersion: string): PackageInfo {
    const packageInfo = this.getPackageInfo(packagePath);

    if (packageInfo.version !== expectedVersion) {
      throw new Error(
        `Version mismatch:\n  Expected: ${expectedVersion}\n  Found: ${packageInfo.version}`
      );
    }

    return packageInfo;
  }
}
