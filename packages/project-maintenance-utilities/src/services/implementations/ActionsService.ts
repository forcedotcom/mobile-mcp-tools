import * as core from '@actions/core';
import { ActionsServiceProvider } from '../interfaces/ActionsServiceProvider.js';

/**
 * Concrete implementation of ActionsServiceProvider using @actions/core
 */
export class ActionsService implements ActionsServiceProvider {
  info(message: string): void {
    core.info(message);
  }

  warning(message: string): void {
    core.warning(message);
  }

  error(message: string): void {
    core.error(message);
  }

  setOutput(name: string, value: string): void {
    core.setOutput(name, value);
  }

  exportVariable(name: string, value: string): void {
    core.exportVariable(name, value);
  }

  setFailed(message: string): void {
    core.setFailed(message);
  }
}
