import { BuildExecutorResult } from '../metadata.js';

/**
 * Interface for a platform-specific build strategy.
 */
export interface BuildStrategy {
  /**
   * Executes the build process for a specific platform.
   * @param projectPath The path to the project to be built.
   * @param sendProgress A function to send progress notifications.
   * @returns A promise that resolves with the result of the build.
   */
  build(
    projectPath: string,
    sendProgress: (message: string, progress: number, total: number) => Promise<void>
  ): Promise<BuildExecutorResult>;
}
