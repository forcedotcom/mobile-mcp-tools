# Project Maintenance Utilities

This TypeScript project contains various utilities for managing projects within the repo.

## Features

- The JavaScript modules used by the project's GitHub Actions workflows for releasing and publishing packages.

## Project Structure

```
packages/project-maintenance-utilities/
├── src/                         # TypeScript source code
│   ├── package-utils.ts         # Package.json operations
│   ├── github-utils.ts          # GitHub API operations
│   ├── npm-utils.ts             # NPM operations
│   ├── logger.ts                # Logging utilities
│   ├── release-orchestrator.ts  # High-level workflow orchestration
│   └── index.ts                 # Main entry point
├── tests/                       # Unit tests
│   └── package-utils.test.js
├── dist/                        # Compiled JavaScript output
├── project.json                 # Nx project configuration
├── package.json                 # NPM package configuration
├── tsconfig.json                # TypeScript configuration
├── vitest.config.js             # Test configuration
└── README.md                    # This file
```

## Development Workflow

The project uses a simple build workflow:

1. **Development**: Edit TypeScript files in `src/`
2. **Build**: `nx build project-maintenance-utilities` compiles to `dist/`
3. **Test**: `nx test project-maintenance-utilities` runs unit tests

```bash
# Development workflow
nx build project-maintenance-utilities    # Compile TypeScript
nx test project-maintenance-utilities    # Run tests
```

## GitHub Actions Integration

GitHub Actions workflows import directly from the built package:

```yaml
- name: Create release using orchestrator
  uses: actions/github-script@v7
  with:
    script: |
      const { ReleaseOrchestrator } = await import('${{ github.workspace }}/packages/project-maintenance-utilities/dist/release-orchestrator.js');

      const orchestrator = new ReleaseOrchestrator(github, context, core);
      await orchestrator.createRelease({
        packagePath: '${{ inputs.package_path }}',
        packageDisplayName: '${{ inputs.package_display_name }}'
      });
```

## Testing

All functions are unit tested to ensure coverage of our GitHub Action workflows:

```bash
# Run tests
nx test project-maintenance-utilities

# Run tests with coverage
nx test project-maintenance-utilities --coverage

# Run tests in watch mode
cd packages/project-maintenance-utilities && npm run test:watch
```

## Nx Commands

```bash
# Build the project
nx build project-maintenance-utilities

# Run tests
nx test project-maintenance-utilities

# Run linting
nx lint project-maintenance-utilities

# Run all targets
nx run-many --target=build,test,lint --projects=project-maintenance-utilities
```
