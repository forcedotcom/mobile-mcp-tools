# Release Workflow Guide

This guide explains how to use the two-phase release and publish workflow for packages in this monorepo.

## Overview

The workflow consists of two phases:

1. **Phase 1a: Create Release** - Creates a GitHub release with a package tarball for testing
2. **Phase 1b: UAT (User Acceptance Testing)** - Manual testing of the release candidate
3. **Phase 2: Publish Release** - Publishes the tested package to NPM

### File Structure

```
.github/workflows/
├── base-create-release.yml         # Base reusable workflow for creating releases
├── base-publish-release.yml        # Base reusable workflow for publishing releases
├── mobile-web-create-release.yml   # Mobile Web specific create release workflow
└── mobile-web-publish-release.yml  # Mobile Web specific publish release workflow
```

### Base Workflows (Reusable)

- **`base-create-release.yml`** - Contains all the logic for creating releases
- **`base-publish-release.yml`** - Contains all the logic for publishing releases

These workflows:

- Use `workflow_call` trigger to make them reusable
- Accept package-specific parameters as inputs

### Current Package-Specific Workflows

- **`mobile-web-create-release.yml`** - Calls base-create-release with mobile-web parameters
- **`mobile-web-publish-release.yml`** - Calls base-publish-release with mobile-web parameters

## Prerequisites

### Package Requirements

Each package must have:

- A valid `package.json` file
- A `build` script (if the package needs building)
- A `test` script (for running tests during release)

## Phase 1a: Create Release

### How to Run

1. Go to the **Actions** tab in your GitHub repository
2. Select the **package-specific create release workflow** (e.g., `Mobile Web - Create Release`)
3. Click **Run workflow**
4. Select the branch you want to run against

### Available Package Workflows

- **Mobile Web MCP Server**: `Mobile Web - Create Release`
- _(Add new packages here as they're created)_

### What It Does

1. **Validates** the package structure and dependencies
2. **Runs tests** to ensure package quality
3. **Builds** the package using the build script
4. **Creates a tarball** using `npm pack`
5. **Creates a git tag** with format `<package-name>_v<version>`
6. **Creates a GitHub release** marked as prerelease with the tarball attached as an asset, and automatically generated release notes

### Tag and Release Naming

- **Git Tag**: `<package-name>_v<version>` (e.g., `salesforce-mobile-web-mcp-server_v1.2.3`)
- **Release Name**: `<package-display-name> v<version>` (e.g., `Mobile Web MCP Server v1.2.3`)

The package name for tags is derived from the full package name in package.json, replacing slashes with dashes.

### Release Notes

The workflow automatically generates comprehensive release notes using GitHub's built-in release notes generation feature. This automatically includes:

- **What's Changed**: Automatically generated from pull request titles and descriptions
- **New Contributors**: Information about first-time contributors to the project
- **Full Changelog**: Link to view all changes between releases

The release notes also include:

- Package name and version
- Brief description of the release as a testing candidate
- Instructions to use the publish workflow after testing

The automatically generated content is combined with the testing instructions to provide both detailed change information and clear next steps for the release process.

## Phase 1b: UAT (User Acceptance Testing)

### Manual Testing Process

1. Navigate to the created GitHub release
2. Review the release notes and package details
3. Download the package tarball (`.tgz` file)
4. Test the package in your target environment:

```bash
# Install the tarball locally
npm install path/to/downloaded-package.tgz

# Or test in a separate project
cd /path/to/test-project
npm install /path/to/downloaded-package.tgz
```

5. Perform your acceptance testing
6. If issues are found, fix them and create a new release (increment version first)

## Phase 2: Publish Release

### How to Run

1. Go to the **Actions** tab in your GitHub repository
2. Select the **package-specific publish workflow** (e.g., `Mobile Web - Publish Release`)
3. Click **Run workflow**
4. Fill in the parameters:
   - **Release tag**: The git tag of the release to publish (e.g., `salesforce-mobile-web-mcp-server_v1.0.0`)
   - **NPM tag**: The NPM tag to publish under (dropdown with options: `latest`, `beta`, `alpha`, `next`)
   - **Dry run**: Check this to test without actually publishing

### Available Package Workflows

- **Mobile Web MCP Server**: `Mobile Web - Publish Release`
- _(Add new packages here as they're created)_

### What It Does

1. **Validates** the release tag and checks if the release exists
2. **Downloads** the tarball from the GitHub release
3. **Verifies** the tarball contents match the expected version
4. **Checks** if the version is already published on NPM
5. **Publishes** the package to NPM with the specified tag
6. **Updates** the GitHub release to remove the prerelease flag

### NPM Tags

- `latest` (default): The main release channel
- `beta`: Beta releases
- `alpha`: Alpha releases
- `next`: Next version previews

## Adding New Packages

To support a new package in the release workflow:

1. **Create the create release workflow** (e.g., `.github/workflows/your-package-create-release.yml`):

```yaml
name: Your Package - Create Release
run-name: Create release for Your Package

on:
  workflow_dispatch:

jobs:
  create-release:
    uses: ./.github/workflows/base-create-release.yml
    with:
      package_display_name: 'Your Package Display Name'
      package_path: 'packages/your-package'
    permissions:
      contents: write
      packages: write
```

2. **Create the publish release workflow** (e.g., `.github/workflows/your-package-publish-release.yml`):

```yaml
name: Your Package - Publish Release
run-name: Publish Your Package release to NPM

on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: 'Release tag to publish (e.g., your-package_v1.0.0)'
        required: true
        type: string
      npm_tag:
        description: 'NPM tag to publish under'
        required: false
        type: choice
        options:
          - latest
          - beta
          - alpha
          - next
        default: 'latest'
      dry_run:
        description: 'Perform a dry run (do not actually publish)'
        required: false
        type: boolean
        default: false

jobs:
  publish-release:
    uses: ./.github/workflows/base-publish-release.yml
    with:
      package_display_name: 'Your Package Display Name'
      package_path: 'packages/your-package'
      release_tag: ${{ inputs.release_tag }}
      npm_tag: ${{ inputs.npm_tag }}
      dry_run: ${{ inputs.dry_run }}
    secrets: inherit
    permissions:
      contents: write
      packages: write
```

3. **Ensure your package** follows the standard structure with `package.json`, build script, and test script

4. **Update this documentation** to list the new workflows in the "Available Package Workflows" sections

## Troubleshooting

### Common Issues

1. **"Tag already exists"**: The version hasn't been bumped since the last release
   - Solution: Update the version in `package.json`

2. **"Package already published"**: Trying to publish a version that already exists
   - Solution: Increment the version and create a new release

3. **"NPM credentials not configured"**: Missing or invalid NPM_TOKEN
   - Solution: Add valid NPM_TOKEN to repository secrets

4. **"Build failed"**: Package build script failed
   - Solution: Fix build issues and ensure `npm run build` works locally

5. **"Tests failed"**: Package tests failed during release
   - Solution: Fix failing tests and ensure `npm run test` passes locally
