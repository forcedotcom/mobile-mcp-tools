import { ActionsServiceProvider } from './services/index.js';

interface PackageInfo {
  packageFullName: string;
  version: string;
  tagName: string;
}

interface ReleaseInfo {
  packageFullName: string;
  version: string;
  tagName: string;
  tarballName: string;
}

/**
 * GitHub Actions reporter utility for logging, outputs, and workflow control
 */
export class ActionsReporter {
  constructor(private actionsService: ActionsServiceProvider) {}

  /**
   * Log an info message
   * @param message - Message to log
   */
  info(message: string): void {
    this.actionsService.info(message);
  }

  /**
   * Log a warning message
   * @param message - Message to log
   */
  warning(message: string): void {
    this.actionsService.warning(message);
  }

  /**
   * Log an error message
   * @param message - Message to log
   */
  error(message: string): void {
    this.actionsService.error(message);
  }

  /**
   * Log a step message
   * @param message - Step message
   */
  step(message: string): void {
    this.actionsService.info(`🔄 ${message}`);
  }

  /**
   * Log a success message
   * @param message - Success message
   */
  success(message: string): void {
    this.actionsService.info(`✅ ${message}`);
  }

  /**
   * Set a GitHub Actions output
   * @param name - Output name
   * @param value - Output value
   */
  setOutput(name: string, value: string): void {
    this.actionsService.setOutput(name, value);
  }

  /**
   * Export a GitHub Actions variable
   * @param name - Variable name
   * @param value - Variable value
   */
  exportVariable(name: string, value: string): void {
    this.actionsService.exportVariable(name, value);
  }

  /**
   * Set a GitHub Actions failed status
   * @param message - Failure message
   */
  setFailed(message: string): void {
    this.actionsService.setFailed(message);
  }

  /**
   * Log package information
   * @param packageInfo - Package information
   */
  packageInfo(packageInfo: PackageInfo): void {
    this.actionsService.info(`📦 Package: ${packageInfo.packageFullName}`);
    this.actionsService.info(`🔢 Version: ${packageInfo.version}`);
    this.actionsService.info(`🏷️  Tag: ${packageInfo.tagName}`);
  }

  /**
   * Log release information
   * @param releaseInfo - Release information
   */
  releaseInfo(releaseInfo: ReleaseInfo): void {
    this.actionsService.info('');
    this.actionsService.info('📋 Release Details:');
    this.actionsService.info(`  Package: ${releaseInfo.packageFullName}`);
    this.actionsService.info(`  Version: ${releaseInfo.version}`);
    this.actionsService.info(`  Tag: ${releaseInfo.tagName}`);
    this.actionsService.info(`  Tarball: ${releaseInfo.tarballName}`);
  }

  /**
   * Log links
   * @param links - Links object
   */
  links(links: Record<string, string>): void {
    this.actionsService.info('');
    this.actionsService.info('🔗 Links:');
    Object.entries(links).forEach(([label, url]) => {
      this.actionsService.info(`  ${label}: ${url}`);
    });
  }

  /**
   * Log next steps
   * @param steps - Array of steps
   */
  nextSteps(steps: string[]): void {
    this.actionsService.info('');
    this.actionsService.info('📋 Next Steps:');
    steps.forEach((step, index) => {
      this.actionsService.info(`${index + 1}. ${step}`);
    });
  }
}
