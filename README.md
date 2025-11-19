# mobile-mcp-tools

An open source monorepo for extensible Salesforce Mobile Model Context Protocol (MCP) servers and tools, maintained by the Mobile Platform Experience team.

[![Codecov](https://codecov.io/gh/forcedotcom/mobile-mcp-tools/branch/main/graph/badge.svg?flag=monorepo)](https://codecov.io/gh/forcedotcom/mobile-mcp-tools?flag=monorepo)
[![Build Status](https://github.com/forcedotcom/mobile-mcp-tools/workflows/run-tests/badge.svg)](https://github.com/forcedotcom/mobile-mcp-tools/actions)

## Overview

Modern large language models (LLMs) often lack sufficient context about the APIs and development patterns available within the Salesforce Mobile Platform ecosystem. This project provides Model Context Protocol (MCP) servers that deliver precise, context-specific grounding information—including TypeScript types, API documentation, usage patterns, and platform-specific guidance—enabling LLMs to produce exceptional, production-ready mobile solutions.

The `mobile-mcp-tools` project provides a robust, extensible monorepo for developing and publishing MCP servers and tools that deliver grounding context for Salesforce Mobile Platform development scenarios. The architecture is intentionally flexible to support multiple MCP servers and tools as the mobile development landscape evolves.

## Project Goals

- **Centralize MCP Server Development**: Provide a single, well-structured repository for developing, maintaining, and publishing MCP servers and tools related to Salesforce Mobile Platform development
- **Extensibility**: Architect the project as an "umbrella project" to support a growing ecosystem of MCP servers and tools targeting different aspects of the mobile development experience
- **Open Source Best Practices**: Foster community collaboration, transparency, and code quality through open source standards and clear documentation
- **Broad MCP Host Compatibility**: Ensure compatibility across the MCP ecosystem while optimizing for Salesforce development workflows

For detailed project vision and design principles, see [Project Overview](./docs/1_project_overview.md).

## Packages

This monorepo contains the following packages:

### [@salesforce/mobile-native-mcp-server](./packages/mobile-native-mcp-server/)

MCP server providing comprehensive tooling support for Salesforce Mobile Native development scenarios. Includes:

- **Template Discovery**: Tools for discovering and selecting appropriate native mobile app templates for iOS and Android platforms
- **Project Planning**: Guidance for template selection based on platform requirements and feature keywords
- **App Deployment**: Comprehensive deployment guidance for iOS and Android apps including build, deployment, and verification steps
- **SDK Integration**: Integration with Salesforce Mobile SDK plugin for native app development

**Installation**: `npx -y @salesforce/mobile-native-mcp-server`

### [project-maintenance-utilities](./packages/project-maintenance-utilities/)

TypeScript utilities for managing projects within the monorepo, including:

- **Release Orchestration**: Automated GitHub Actions workflows for creating and publishing package releases
- **Package Management**: Utilities for package.json operations, version management, and tarball creation
- **GitHub Integration**: Tools for GitHub API operations, release management, and workflow automation
- **NPM Operations**: Utilities for NPM publishing, version checking, and package validation

### [evaluation](./packages/evaluation/)

Testing and evaluation framework for assessing MCP tool effectiveness:

- **Component Testing**: Automated testing of generated Lightning web components
- **Accuracy Scoring**: Evaluation metrics for component quality and mobile capability usage
- **MCP Client Integration**: Testing framework for MCP host/client interactions
- **Quality Assurance**: Regression detection and performance validation tools

### Future MCP Servers

The monorepo is designed to support additional MCP servers in the future, as we build out our agentic support for additional Salesforce Mobile Platform development scenarios. If you have functionality you'd like to see, feel free to [file an issue](/issues/new/choose) and we'd be happy to consider it.

## Documentation

For comprehensive project documentation, including setup guides, API references, and implementation details:

- **[Project Overview](./docs/1_project_overview.md)**: Project goals, architecture, and design principles
- **[Mobile Native Capabilities](./docs/3_mobile_native_capabilities.md)**: Tool suite for device capabilities
- **[Mobile Offline](./docs/4_mobile_offline.md)**: Tool suite for offline compatibility

## Development

### Build

Build all packages:

```bash
npm run build:all
```

### Testing

Run all unit tests:

```bash
npm run test:all
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Linting and Formatting

```bash
npm run lint             # Run ESLint
npm run prettier:verify  # Check code formatting
npm run prettier:fix     # Fix code formatting
```

## Project Structure

```
mobile-mcp-tools/
├── packages/
│   ├── mobile-native-mcp-server/       # @salesforce/mobile-native-mcp-server
│   ├── evaluation/                     # Testing and evaluation utilities
│   ├── github-actions-scripts/         # CI/CD automation (deprecated)
│   └── project-maintenance-utilities/  # Project automation utilities
├── docs/                               # Project documentation
│   ├── 1_project_overview.md
│   ├── 5_mobile_native_app_generation.md
│   ├── 7_utils_xcode_add_files_design.md
│   └── 8_prd_wordflow_architecture.md
├── .github/workflows/           # GitHub Actions workflows
├── nx.json                      # Nx workspace configuration
├── package.json                 # Monorepo dependencies and scripts
└── tsconfig.base.json           # Shared TypeScript configuration
```

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes
3. Run tests: `npm run test:all`
4. Run linting: `npm run lint`
5. Submit a pull request

Please see our [Contributing Guidelines](./CONTRIBUTING.md) for detailed information.

## License

MIT
