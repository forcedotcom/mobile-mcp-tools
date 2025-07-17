/**
 * Interface for GitHub Actions operations
 */
export interface ActionsServiceProvider {
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  setOutput(name: string, value: string): void;
  exportVariable(name: string, value: string): void;
  setFailed(message: string): void;
}
