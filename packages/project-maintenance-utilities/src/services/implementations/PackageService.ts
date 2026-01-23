import { join } from 'path';
import { valid as semverValid } from 'semver';
import { FileSystemServiceProvider } from '../interfaces/FileSystemServiceProvider.js';
import {
  PackageServiceProvider,
  PackageInfo,
  ParsedReleaseTag,
} from '../interfaces/PackageServiceProvider.js';

export class PackageService implements PackageServiceProvider {
  private debugLog: (message: string) => void;

  constructor(
    private fsService: FileSystemServiceProvider,
    debugLog?: (message: string) => void
  ) {
    this.debugLog = debugLog ?? (() => {});
  }

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

  /**
   * Find workspace root by checking the workspaceRoot from FileSystemServiceProvider
   * @param startPath - Path to start searching from (unused, kept for interface compatibility)
   * @returns Path to workspace root or null if not found
   */
  findWorkspaceRoot(startPath: string): string | null {
    // Unused parameter kept for interface compatibility
    void startPath;

    const workspaceRoot = this.fsService.workspaceRoot;
    const packageJsonPath = join(workspaceRoot, 'package.json');

    if (!this.fsService.existsSync(packageJsonPath)) {
      this.debugLog(`package.json not found at workspace root: ${packageJsonPath}`);
      return null;
    }

    try {
      const packageJsonContent = this.fsService.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      // Check if this is a workspace root (has workspaces field)
      if (packageJson.workspaces) {
        return workspaceRoot;
      }
      this.debugLog(`package.json at ${packageJsonPath} does not have workspaces field`);
    } catch (error) {
      this.debugLog(`Could not parse package.json at ${packageJsonPath}: ${error}`);
    }

    return null;
  }

  /**
   * Resolve wildcard dependencies by finding packages in the workspace and replacing * with versions
   * @param packagePath - Path to package directory
   * @param workspaceRoot - Path to workspace root directory
   * @returns Object with original and modified package.json content
   */
  resolveWildcardDependencies(
    packagePath: string,
    workspaceRoot: string
  ): { originalContent: string; modifiedContent: string } {
    const packageJsonPath = join(packagePath, 'package.json');
    const originalContent = this.fsService.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(originalContent);

    // Find all workspace packages and their versions
    const workspacePackages = this.findWorkspacePackages(workspaceRoot);
    const resolvedVersions: Record<string, string> = {};

    // Resolve versions for dependencies with "*"
    if (packageJson.dependencies) {
      for (const [depName, depVersion] of Object.entries(packageJson.dependencies)) {
        if (depVersion === '*') {
          const workspacePackage = workspacePackages.find(pkg => pkg.name === depName);
          if (workspacePackage) {
            resolvedVersions[depName] = workspacePackage.version;
          } else {
            throw new Error(
              `Cannot resolve wildcard dependency "${depName}": package not found in workspace. ` +
                `Wildcard dependencies must reference packages within the monorepo.`
            );
          }
        }
      }
    }

    // Resolve versions for devDependencies with "*" (though typically these shouldn't be published)
    if (packageJson.devDependencies) {
      for (const [depName, depVersion] of Object.entries(packageJson.devDependencies)) {
        if (depVersion === '*') {
          const workspacePackage = workspacePackages.find(pkg => pkg.name === depName);
          if (workspacePackage) {
            resolvedVersions[depName] = workspacePackage.version;
          }
        }
      }
    }

    // If no wildcards found, return original
    if (Object.keys(resolvedVersions).length === 0) {
      return {
        originalContent,
        modifiedContent: originalContent,
      };
    }

    // Create modified package.json with resolved versions
    const modifiedPackageJson = JSON.parse(originalContent);

    // Replace "*" in dependencies with "^<version>"
    if (modifiedPackageJson.dependencies) {
      for (const [depName, version] of Object.entries(resolvedVersions)) {
        if (modifiedPackageJson.dependencies[depName] === '*') {
          modifiedPackageJson.dependencies[depName] = `^${version}`;
        }
      }
    }

    // Replace "*" in devDependencies with "^<version>"
    if (modifiedPackageJson.devDependencies) {
      for (const [depName, version] of Object.entries(resolvedVersions)) {
        if (modifiedPackageJson.devDependencies[depName] === '*') {
          modifiedPackageJson.devDependencies[depName] = `^${version}`;
        }
      }
    }

    const modifiedContent = JSON.stringify(modifiedPackageJson, null, 2) + '\n';

    return {
      originalContent,
      modifiedContent,
    };
  }

  /**
   * Find all packages in the workspace
   * @param workspaceRoot - Path to workspace root
   * @returns Array of package info objects
   */
  private findWorkspacePackages(workspaceRoot: string): Array<{ name: string; version: string }> {
    const packages: Array<{ name: string; version: string }> = [];
    const packagesDir = join(workspaceRoot, 'packages');

    if (!this.fsService.existsSync(packagesDir)) {
      return packages;
    }

    try {
      // Read directory entries
      const entries = this.fsService.readdirSync(packagesDir);
      for (const entry of entries) {
        const packagePath = join(packagesDir, entry);
        const packageJsonPath = join(packagePath, 'package.json');

        // Check if it's a directory with a package.json
        if (this.fsService.existsSync(packageJsonPath)) {
          try {
            const packageJsonContent = this.fsService.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);
            if (packageJson.name && packageJson.version) {
              packages.push({
                name: packageJson.name,
                version: packageJson.version,
              });
            }
          } catch (error) {
            this.debugLog(`Could not parse package.json at ${packageJsonPath}: ${error}`);
          }
        }
      }
    } catch (error) {
      this.debugLog(`Could not read packages directory at ${packagesDir}: ${error}`);
    }

    return packages;
  }
}
