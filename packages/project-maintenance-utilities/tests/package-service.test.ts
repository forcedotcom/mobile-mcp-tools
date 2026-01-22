import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';
import { PackageService } from '../src/index.js';
import { MockFileSystemService } from './mocks/index.js';

describe('PackageService', () => {
  let packageService: PackageService;
  let mockFileSystemService: MockFileSystemService;

  beforeEach(() => {
    mockFileSystemService = new MockFileSystemService();
    packageService = new PackageService(mockFileSystemService);
  });

  describe('getPackageInfo', () => {
    it('should extract package information correctly', () => {
      const packageJson = {
        name: '@salesforce/mobile-web-mcp-server',
        version: '1.2.3',
      };

      mockFileSystemService.setFileContent(
        join('mock', 'path', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.getPackageInfo(join('mock', 'path'));

      expect(result).toEqual({
        packageFullName: '@salesforce/mobile-web-mcp-server',
        version: '1.2.3',
        tagName: 'salesforce-mobile-web-mcp-server_v1.2.3',
        tagPrefix: 'salesforce-mobile-web-mcp-server',
      });
    });

    it('should handle packages without scope', () => {
      const packageJson = {
        name: 'my-package',
        version: '0.1.0',
      };

      mockFileSystemService.setFileContent(
        join('mock', 'path', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.getPackageInfo(join('mock', 'path'));

      expect(result).toEqual({
        packageFullName: 'my-package',
        version: '0.1.0',
        tagName: 'my-package_v0.1.0',
        tagPrefix: 'my-package',
      });
    });

    it('should throw error if package.json not found', () => {
      expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
        'package.json not found'
      );
    });

    describe('name transformation logic', () => {
      it('should handle multiple scoped packages', () => {
        const packageJson = {
          name: '@org/my-package',
          version: '1.0.0',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@org/my-package',
          version: '1.0.0',
          tagName: 'org-my-package_v1.0.0',
          tagPrefix: 'org-my-package',
        });
      });

      it('should handle packages with slashes in name', () => {
        const packageJson = {
          name: '@scope/nested/package',
          version: '2.1.0',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@scope/nested/package',
          version: '2.1.0',
          tagName: 'scope-nested-package_v2.1.0',
          tagPrefix: 'scope-nested-package',
        });
      });

      it('should handle packages with multiple slashes', () => {
        const packageJson = {
          name: '@company/team/project/module',
          version: '0.3.1',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@company/team/project/module',
          version: '0.3.1',
          tagName: 'company-team-project-module_v0.3.1',
          tagPrefix: 'company-team-project-module',
        });
      });

      it('should handle different scope patterns', () => {
        const packageJson = {
          name: '@my-org123/awesome-package',
          version: '1.2.3',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@my-org123/awesome-package',
          version: '1.2.3',
          tagName: 'my-org123-awesome-package_v1.2.3',
          tagPrefix: 'my-org123-awesome-package',
        });
      });

      it('should handle packages with underscores and hyphens', () => {
        const packageJson = {
          name: '@test/my_package-name',
          version: '4.5.6',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@test/my_package-name',
          version: '4.5.6',
          tagName: 'test-my_package-name_v4.5.6',
          tagPrefix: 'test-my_package-name',
        });
      });

      it('should handle unscoped packages with complex names', () => {
        const packageJson = {
          name: 'my-complex_package.name',
          version: '7.8.9',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: 'my-complex_package.name',
          version: '7.8.9',
          tagName: 'my-complex_package.name_v7.8.9',
          tagPrefix: 'my-complex_package.name',
        });
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid JSON', () => {
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          'invalid json content'
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow();
      });

      it('should throw error for missing name field', () => {
        const packageJson = {
          version: '1.0.0',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
          "Invalid package.json: missing or invalid 'name' field"
        );
      });

      it('should throw error for missing version field', () => {
        const packageJson = {
          name: 'test-package',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
          "Invalid package.json: missing or invalid 'version' field"
        );
      });

      it('should throw error for empty package.json', () => {
        const packageJson = {};
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
          "Invalid package.json: missing or invalid 'name' field"
        );
      });

      it('should throw error for malformed package.json with null values', () => {
        const packageJson = {
          name: null,
          version: null,
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
          "Invalid package.json: missing or invalid 'name' field"
        );
      });

      it('should throw error for invalid name field type', () => {
        const packageJson = {
          name: 123,
          version: '1.0.0',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
          "Invalid package.json: missing or invalid 'name' field"
        );
      });

      it('should throw error for invalid version field type', () => {
        const packageJson = {
          name: 'test-package',
          version: 123,
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        expect(() => packageService.getPackageInfo(join('mock', 'path'))).toThrow(
          "Invalid package.json: missing or invalid 'version' field"
        );
      });
    });

    describe('edge cases', () => {
      it('should handle pre-release versions', () => {
        const packageJson = {
          name: '@beta/test-package',
          version: '1.0.0-alpha.1',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@beta/test-package',
          version: '1.0.0-alpha.1',
          tagName: 'beta-test-package_v1.0.0-alpha.1',
          tagPrefix: 'beta-test-package',
        });
      });

      it('should handle versions with build metadata', () => {
        const packageJson = {
          name: 'build-package',
          version: '2.0.0+build.123',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: 'build-package',
          version: '2.0.0+build.123',
          tagName: 'build-package_v2.0.0+build.123',
          tagPrefix: 'build-package',
        });
      });

      it('should handle single character package names', () => {
        const packageJson = {
          name: 'a',
          version: '1.0.0',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: 'a',
          version: '1.0.0',
          tagName: 'a_v1.0.0',
          tagPrefix: 'a',
        });
      });

      it('should handle very long package names', () => {
        const packageJson = {
          name: '@very-long-org-name/extremely-long-package-name-with-many-parts',
          version: '1.0.0',
        };
        mockFileSystemService.setFileContent(
          join('mock', 'path', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const result = packageService.getPackageInfo(join('mock', 'path'));

        expect(result).toEqual({
          packageFullName: '@very-long-org-name/extremely-long-package-name-with-many-parts',
          version: '1.0.0',
          tagName: 'very-long-org-name-extremely-long-package-name-with-many-parts_v1.0.0',
          tagPrefix: 'very-long-org-name-extremely-long-package-name-with-many-parts',
        });
      });
    });
  });

  describe('createReleaseName', () => {
    it('should create proper release name', () => {
      const result = packageService.createReleaseName('My Package', '1.0.0');
      expect(result).toBe('My Package v1.0.0');
    });
  });

  describe('validatePackageVersion', () => {
    it('should validate matching version', () => {
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
      };

      mockFileSystemService.setFileContent(
        join('mock', 'path', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.validatePackageVersion(join('mock', 'path'), '1.0.0');

      expect(result).toEqual({
        packageFullName: 'test-package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      });
    });

    it('should throw error for mismatched version', () => {
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
      };

      mockFileSystemService.setFileContent(
        join('mock', 'path', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      expect(() => packageService.validatePackageVersion(join('mock', 'path'), '2.0.0')).toThrow(
        'Version mismatch'
      );
    });
  });

  describe('parseReleaseTag', () => {
    describe('valid release tags', () => {
      it('should parse simple release tag', () => {
        const result = packageService.parseReleaseTag('mobile-web_v1.2.3');
        expect(result).toEqual({
          packageIdentifier: 'mobile-web',
          packageVersion: '1.2.3',
        });
      });

      it('should handle complex package names with hyphens', () => {
        const result = packageService.parseReleaseTag('mobile-web-mcp-server_v2.1.0');
        expect(result).toEqual({
          packageIdentifier: 'mobile-web-mcp-server',
          packageVersion: '2.1.0',
        });
      });

      it('should handle package names with underscores', () => {
        const result = packageService.parseReleaseTag('my_package_name_v1.0.0');
        expect(result).toEqual({
          packageIdentifier: 'my_package_name',
          packageVersion: '1.0.0',
        });
      });

      it('should handle pre-release versions', () => {
        const result = packageService.parseReleaseTag('mypackage_v1.0.0-alpha.1');
        expect(result).toEqual({
          packageIdentifier: 'mypackage',
          packageVersion: '1.0.0-alpha.1',
        });
      });

      it('should handle beta versions', () => {
        const result = packageService.parseReleaseTag('test-package_v2.0.0-beta.3');
        expect(result).toEqual({
          packageIdentifier: 'test-package',
          packageVersion: '2.0.0-beta.3',
        });
      });

      it('should handle single character package names', () => {
        const result = packageService.parseReleaseTag('a_v1.0.0');
        expect(result).toEqual({
          packageIdentifier: 'a',
          packageVersion: '1.0.0',
        });
      });

      it('should handle SemVer patch versions', () => {
        const result = packageService.parseReleaseTag('package_v1.0.0');
        expect(result).toEqual({
          packageIdentifier: 'package',
          packageVersion: '1.0.0',
        });
      });

      it('should handle versions with build metadata', () => {
        const result = packageService.parseReleaseTag('mypackage_v1.0.0+build.123');
        expect(result).toEqual({
          packageIdentifier: 'mypackage',
          packageVersion: '1.0.0+build.123',
        });
      });

      it('should handle versions with v prefix (normalized by semver)', () => {
        const result = packageService.parseReleaseTag('package_vv1.0.0');
        expect(result).toEqual({
          packageIdentifier: 'package',
          packageVersion: 'v1.0.0', // semver accepts this format
        });
      });

      it('should handle versions with trailing whitespace (normalized by semver)', () => {
        const result = packageService.parseReleaseTag('package_v1.0.0 ');
        expect(result).toEqual({
          packageIdentifier: 'package',
          packageVersion: '1.0.0 ', // semver accepts and normalizes this
        });
      });
    });

    describe('edge cases with valid SemVer versions', () => {
      it('should handle multiple _v patterns by using the last one (if version is valid SemVer)', () => {
        const result = packageService.parseReleaseTag('package_v1.0.0_v2.0.0');
        expect(result).toEqual({
          packageIdentifier: 'package_v1.0.0',
          packageVersion: '2.0.0',
        });
      });

      it('should allow spaces in package names (if version is valid SemVer)', () => {
        const result = packageService.parseReleaseTag('my package_v1.0.0');
        expect(result).toEqual({
          packageIdentifier: 'my package',
          packageVersion: '1.0.0',
        });
      });
    });

    describe('invalid release tags', () => {
      it('should throw error for empty string', () => {
        expect(() => packageService.parseReleaseTag('')).toThrow('Invalid release tag format');
      });

      it('should throw error for just _v', () => {
        expect(() => packageService.parseReleaseTag('_v')).toThrow('Invalid release tag format');
      });

      it('should throw error for missing package name', () => {
        expect(() => packageService.parseReleaseTag('_v1.0.0')).toThrow(
          'Invalid release tag format'
        );
      });

      it('should throw error for missing version', () => {
        expect(() => packageService.parseReleaseTag('package_v')).toThrow(
          'Invalid release tag format'
        );
      });

      it('should throw error for missing _v separator', () => {
        expect(() => packageService.parseReleaseTag('package-1.0.0')).toThrow(
          'Invalid release tag format'
        );
      });

      it('should throw error for wrong separator', () => {
        expect(() => packageService.parseReleaseTag('package-v1.0.0')).toThrow(
          'Invalid release tag format'
        );
      });

      it('should throw error for v without underscore', () => {
        expect(() => packageService.parseReleaseTag('packagev1.0.0')).toThrow(
          'Invalid release tag format'
        );
      });
    });

    describe('invalid SemVer versions', () => {
      it('should throw error for invalid SemVer - single number', () => {
        expect(() => packageService.parseReleaseTag('package_v1')).toThrow(
          'Invalid SemVer version in release tag'
        );
      });

      it('should throw error for invalid SemVer - two numbers', () => {
        expect(() => packageService.parseReleaseTag('package_v1.0')).toThrow(
          'Invalid SemVer version in release tag'
        );
      });

      it('should throw error for invalid SemVer - non-numeric version', () => {
        expect(() => packageService.parseReleaseTag('package_vtest')).toThrow(
          'Invalid SemVer version in release tag'
        );
      });

      it('should throw error for invalid SemVer - negative numbers', () => {
        expect(() => packageService.parseReleaseTag('package_v-1.0.0')).toThrow(
          'Invalid SemVer version in release tag'
        );
      });

      it('should throw error for invalid SemVer - extra dots', () => {
        expect(() => packageService.parseReleaseTag('package_v1.0.0.0')).toThrow(
          'Invalid SemVer version in release tag'
        );
      });
    });

    describe('error message format', () => {
      it('should include expected format in error message for invalid tag format', () => {
        expect(() => packageService.parseReleaseTag('invalid-tag')).toThrow(
          'Invalid release tag format: invalid-tag. Expected format: <package-name>_v<semver-version>'
        );
      });

      it('should include the invalid tag in error message for wrong format', () => {
        expect(() => packageService.parseReleaseTag('wrong_format')).toThrow(
          'Invalid release tag format: wrong_format. Expected format: <package-name>_v<semver-version>'
        );
      });

      it('should include specific SemVer error for invalid version', () => {
        expect(() => packageService.parseReleaseTag('package_vinvalid')).toThrow(
          'Invalid SemVer version in release tag: package_vinvalid. Version part "invalid" is not a valid SemVer version.'
        );
      });

      it('should include the invalid version in SemVer error message', () => {
        expect(() => packageService.parseReleaseTag('mypackage_v1.2')).toThrow(
          'Invalid SemVer version in release tag: mypackage_v1.2. Version part "1.2" is not a valid SemVer version.'
        );
      });
    });
  });

  describe('findWorkspaceRoot', () => {
    it('should find workspace root with workspaces field', () => {
      const rootPackageJson = {
        name: 'workspace-root',
        version: '1.0.0',
        workspaces: ['packages/*'],
      };

      // Use absolute paths since resolve() converts to absolute
      const workspacePath = join(process.cwd(), 'workspace');
      const packagePath = join(workspacePath, 'packages', 'some-package');

      mockFileSystemService.setFileContent(
        join(workspacePath, 'package.json'),
        JSON.stringify(rootPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(workspacePath);

      const result = packageService.findWorkspaceRoot(packagePath);

      expect(result).toBe(workspacePath);
    });

    it('should find workspace root with workspace field', () => {
      const rootPackageJson = {
        name: 'workspace-root',
        version: '1.0.0',
        workspace: ['packages/*'],
      };

      // Use absolute paths since resolve() converts to absolute
      const workspacePath = join(process.cwd(), 'workspace');
      const packagePath = join(workspacePath, 'packages', 'some-package');

      mockFileSystemService.setFileContent(
        join(workspacePath, 'package.json'),
        JSON.stringify(rootPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(workspacePath);

      const result = packageService.findWorkspaceRoot(packagePath);

      expect(result).toBe(workspacePath);
    });

    it('should return null if no workspace root found', () => {
      const packageJson = {
        name: 'not-workspace',
        version: '1.0.0',
      };

      mockFileSystemService.setFileContent(
        join('some', 'path', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('some', 'path'));

      const result = packageService.findWorkspaceRoot(join('some', 'path'));

      expect(result).toBeNull();
    });

    it('should walk up directory tree to find workspace root', () => {
      const rootPackageJson = {
        name: 'workspace-root',
        version: '1.0.0',
        workspaces: ['packages/*'],
      };

      // Use absolute paths since resolve() converts to absolute
      const workspacePath = join(process.cwd(), 'workspace');
      const packagesPath = join(workspacePath, 'packages');
      const packagePath = join(packagesPath, 'some-package');

      mockFileSystemService.setFileContent(
        join(workspacePath, 'package.json'),
        JSON.stringify(rootPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(workspacePath);

      // Set up intermediate package.json without workspaces
      const intermediatePackageJson = {
        name: 'intermediate',
        version: '1.0.0',
      };
      mockFileSystemService.setFileContent(
        join(packagesPath, 'package.json'),
        JSON.stringify(intermediatePackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(packagesPath);

      const result = packageService.findWorkspaceRoot(packagePath);

      expect(result).toBe(workspacePath);
    });
  });

  describe('resolveWildcardDependencies', () => {
    beforeEach(() => {
      // Set up workspace root
      const rootPackageJson = {
        name: 'workspace-root',
        version: '1.0.0',
        workspaces: ['packages/*'],
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'package.json'),
        JSON.stringify(rootPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('workspace'));
      mockFileSystemService.setDirectoryExists(join('workspace', 'packages'));
    });

    it('should resolve wildcard dependencies to version ranges', () => {
      // Set up dependency package
      const dependencyPackageJson = {
        name: '@salesforce/magen-mcp-workflow',
        version: '0.0.1',
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'mcp-workflow', 'package.json'),
        JSON.stringify(dependencyPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('workspace', 'packages', 'mcp-workflow'));

      // Set up package with wildcard dependency
      const packageJson = {
        name: '@salesforce/mobile-native-mcp-server',
        version: '0.0.1-alpha.2',
        dependencies: {
          '@salesforce/magen-mcp-workflow': '*',
        },
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'mobile-native', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.resolveWildcardDependencies(
        join('workspace', 'packages', 'mobile-native'),
        join('workspace')
      );

      expect(result.originalContent).toContain('"@salesforce/magen-mcp-workflow": "*"');
      expect(result.modifiedContent).toContain('"@salesforce/magen-mcp-workflow": "^0.0.1"');
      expect(result.modifiedContent).not.toContain('"@salesforce/magen-mcp-workflow": "*"');
    });

    it('should resolve multiple wildcard dependencies', () => {
      // Set up dependency packages
      const workflowPackageJson = {
        name: '@salesforce/magen-mcp-workflow',
        version: '0.0.1',
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'mcp-workflow', 'package.json'),
        JSON.stringify(workflowPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('workspace', 'packages', 'mcp-workflow'));

      const magiPackageJson = {
        name: '@salesforce/workflow-magi',
        version: '0.1.0',
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'workflow-magi', 'package.json'),
        JSON.stringify(magiPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('workspace', 'packages', 'workflow-magi'));

      // Set up package with multiple wildcard dependencies
      const packageJson = {
        name: '@salesforce/mobile-native-mcp-server',
        version: '0.0.1-alpha.2',
        dependencies: {
          '@salesforce/magen-mcp-workflow': '*',
          '@salesforce/workflow-magi': '*',
          'other-package': '^1.0.0', // Should not be modified
        },
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'mobile-native', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.resolveWildcardDependencies(
        join('workspace', 'packages', 'mobile-native'),
        join('workspace')
      );

      expect(result.modifiedContent).toContain('"@salesforce/magen-mcp-workflow": "^0.0.1"');
      expect(result.modifiedContent).toContain('"@salesforce/workflow-magi": "^0.1.0"');
      expect(result.modifiedContent).toContain('"other-package": "^1.0.0"');
      expect(result.modifiedContent).not.toContain('"*"');
    });

    it('should resolve wildcard dependencies in devDependencies', () => {
      const devDependencyPackageJson = {
        name: '@salesforce/test-utils',
        version: '1.2.3',
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'test-utils', 'package.json'),
        JSON.stringify(devDependencyPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('workspace', 'packages', 'test-utils'));

      const packageJson = {
        name: '@salesforce/my-package',
        version: '1.0.0',
        devDependencies: {
          '@salesforce/test-utils': '*',
        },
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'my-package', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.resolveWildcardDependencies(
        join('workspace', 'packages', 'my-package'),
        join('workspace')
      );

      expect(result.modifiedContent).toContain('"@salesforce/test-utils": "^1.2.3"');
    });

    it('should return original content if no wildcards found', () => {
      const packageJson = {
        name: '@salesforce/my-package',
        version: '1.0.0',
        dependencies: {
          'some-package': '^1.0.0',
        },
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'my-package', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.resolveWildcardDependencies(
        join('workspace', 'packages', 'my-package'),
        join('workspace')
      );

      expect(result.originalContent).toBe(result.modifiedContent);
    });

    it('should throw error if wildcard dependency not found in workspace', () => {
      const packageJson = {
        name: '@salesforce/my-package',
        version: '1.0.0',
        dependencies: {
          '@salesforce/non-existent': '*',
        },
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'my-package', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      expect(() =>
        packageService.resolveWildcardDependencies(
          join('workspace', 'packages', 'my-package'),
          join('workspace')
        )
      ).toThrow('Cannot resolve wildcard dependency');
    });

    it('should preserve other package.json fields', () => {
      const dependencyPackageJson = {
        name: '@salesforce/magen-mcp-workflow',
        version: '0.0.1',
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'mcp-workflow', 'package.json'),
        JSON.stringify(dependencyPackageJson, null, 2)
      );
      mockFileSystemService.setDirectoryExists(join('workspace', 'packages', 'mcp-workflow'));

      const packageJson = {
        name: '@salesforce/mobile-native-mcp-server',
        version: '0.0.1-alpha.2',
        description: 'Test package',
        main: 'dist/index.js',
        dependencies: {
          '@salesforce/magen-mcp-workflow': '*',
        },
      };
      mockFileSystemService.setFileContent(
        join('workspace', 'packages', 'mobile-native', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = packageService.resolveWildcardDependencies(
        join('workspace', 'packages', 'mobile-native'),
        join('workspace')
      );

      const modifiedJson = JSON.parse(result.modifiedContent);
      expect(modifiedJson.name).toBe('@salesforce/mobile-native-mcp-server');
      expect(modifiedJson.version).toBe('0.0.1-alpha.2');
      expect(modifiedJson.description).toBe('Test package');
      expect(modifiedJson.main).toBe('dist/index.js');
    });
  });

  describe('restorePackageJson', () => {
    it('should restore original package.json content', () => {
      const originalContent = JSON.stringify(
        {
          name: 'test-package',
          version: '1.0.0',
        },
        null,
        2
      );

      mockFileSystemService.setFileContent(join('test', 'package.json'), 'modified content');

      packageService.restorePackageJson(join('test'), originalContent);

      const restored = mockFileSystemService.getFileContent(join('test', 'package.json'));
      expect(restored).toBe(originalContent);
    });
  });
});
