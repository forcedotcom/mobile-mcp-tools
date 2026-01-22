export interface PackageInfo {
  packageFullName: string;
  version: string;
  tagName: string;
  tagPrefix: string;
}

export interface ParsedReleaseTag {
  packageIdentifier: string;
  packageVersion: string;
}

export interface PackageServiceProvider {
  getPackageInfo(packagePath: string): PackageInfo;
  createReleaseName(displayName: string, version: string): string;
  parseReleaseTag(releaseTag: string): ParsedReleaseTag;
  validatePackageVersion(packagePath: string, expectedVersion: string): PackageInfo;
  findWorkspaceRoot(startPath: string): string | null;
  resolveWildcardDependencies(
    packagePath: string,
    workspaceRoot: string
  ): { originalContent: string; modifiedContent: string };
}
