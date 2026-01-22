import {
  PackageServiceProvider,
  PackageInfo,
  ParsedReleaseTag,
} from '../../src/services/interfaces/PackageServiceProvider.js';

export class MockPackageService implements PackageServiceProvider {
  private packageInfoMap: Map<string, PackageInfo> = new Map();
  private releaseTagMap: Map<string, ParsedReleaseTag> = new Map();
  private validationMap: Map<string, PackageInfo> = new Map();
  private workspaceRootMap: Map<string, string | null> = new Map();
  private wildcardResolutionMap: Map<string, { originalContent: string; modifiedContent: string }> =
    new Map();

  // Mock configuration methods
  setPackageInfo(packagePath: string, packageInfo: PackageInfo): void {
    this.packageInfoMap.set(packagePath, packageInfo);
  }

  setReleaseTag(releaseTag: string, parsedTag: ParsedReleaseTag): void {
    this.releaseTagMap.set(releaseTag, parsedTag);
  }

  setValidation(packagePath: string, expectedVersion: string, packageInfo: PackageInfo): void {
    this.validationMap.set(`${packagePath}:${expectedVersion}`, packageInfo);
  }

  setWorkspaceRoot(startPath: string, workspaceRoot: string | null): void {
    this.workspaceRootMap.set(startPath, workspaceRoot);
  }

  setWildcardResolution(
    packagePath: string,
    workspaceRoot: string,
    resolution: { originalContent: string; modifiedContent: string }
  ): void {
    this.wildcardResolutionMap.set(`${packagePath}:${workspaceRoot}`, resolution);
  }

  clear(): void {
    this.packageInfoMap.clear();
    this.releaseTagMap.clear();
    this.validationMap.clear();
    this.workspaceRootMap.clear();
    this.wildcardResolutionMap.clear();
  }

  // Interface implementation
  getPackageInfo(packagePath: string): PackageInfo {
    const packageInfo = this.packageInfoMap.get(packagePath);
    if (!packageInfo) {
      throw new Error(`Mock: No package info configured for path: ${packagePath}`);
    }
    return packageInfo;
  }

  createReleaseName(displayName: string, version: string): string {
    return `${displayName} v${version}`;
  }

  parseReleaseTag(releaseTag: string): ParsedReleaseTag {
    const parsedTag = this.releaseTagMap.get(releaseTag);
    if (!parsedTag) {
      throw new Error(`Mock: No release tag configured for: ${releaseTag}`);
    }
    return parsedTag;
  }

  validatePackageVersion(packagePath: string, expectedVersion: string): PackageInfo {
    const packageInfo = this.validationMap.get(`${packagePath}:${expectedVersion}`);
    if (!packageInfo) {
      throw new Error(
        `Mock: No validation configured for path: ${packagePath}, version: ${expectedVersion}`
      );
    }
    return packageInfo;
  }

  findWorkspaceRoot(startPath: string): string | null {
    // Check for exact match first
    if (this.workspaceRootMap.has(startPath)) {
      return this.workspaceRootMap.get(startPath) ?? null;
    }
    // Check for prefix matches (walking up directory tree)
    for (const [key, value] of this.workspaceRootMap.entries()) {
      if (startPath.startsWith(key) || key.startsWith(startPath)) {
        return value;
      }
    }
    // Default: return null (no workspace root found)
    return null;
  }

  resolveWildcardDependencies(
    packagePath: string,
    workspaceRoot: string
  ): { originalContent: string; modifiedContent: string } {
    const resolution = this.wildcardResolutionMap.get(`${packagePath}:${workspaceRoot}`);
    if (!resolution) {
      // Default: return same content (no wildcards to resolve)
      const packageJson = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
        },
        null,
        2
      );
      return {
        originalContent: packageJson,
        modifiedContent: packageJson,
      };
    }
    return resolution;
  }

  restorePackageJson(packagePath: string, originalContent: string): void {
    // Mock implementation - in real code this writes to file system
    // For tests, we don't need to do anything since we're using mocks
  }
}
