import {
  PackageServiceProvider,
  PackageInfo,
  ParsedReleaseTag,
} from '../../src/services/interfaces/PackageServiceProvider.js';

export class MockPackageService implements PackageServiceProvider {
  private packageInfoMap: Map<string, PackageInfo> = new Map();
  private releaseTagMap: Map<string, ParsedReleaseTag> = new Map();
  private validationMap: Map<string, PackageInfo> = new Map();

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

  clear(): void {
    this.packageInfoMap.clear();
    this.releaseTagMap.clear();
    this.validationMap.clear();
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
}
