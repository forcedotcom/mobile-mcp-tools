// Main entry point for GitHub Actions scripts

// Package types
export type { PackageInfo, ParsedReleaseTag } from './services/interfaces/index.js';

// Classes for dependency injection
export { ActionsReporter } from './actions-reporter.js';
export { ReleaseOrchestrator, createReleaseOrchestrator } from './release-orchestrator.js';
export { NpmUtils } from './npm-utils.js';
export { GitHubUtils } from './github-utils.js';

// Service interfaces and implementations
export type {
  FileSystemServiceProvider,
  ProcessServiceProvider,
  GitHubServiceProvider,
  ActionsServiceProvider,
  PackageServiceProvider,
  Release,
} from './services/index.js';

export {
  FileSystemService,
  ProcessService,
  GitHubService,
  ActionsService,
  PackageService,
} from './services/index.js';
