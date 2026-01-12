/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  BaseNode,
  createComponentLogger,
  Logger,
  CommandRunner,
  WorkflowRunnableConfig,
  ProgressReporter,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../../metadata.js';

/**
 * Boots the target iOS simulator if it's not already running.
 */
export class iOSBootSimulatorNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('iosBootSimulator');
    this.logger = logger ?? createComponentLogger('iOSBootSimulatorNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'iOS') {
      this.logger.debug('Skipping iOS simulator boot for non-iOS platform');
      return {};
    }

    // Skip if simulator is already running
    if (state.simulatorRunning) {
      this.logger.debug('Simulator already running, skipping boot');
      return {};
    }

    if (!state.targetDevice) {
      this.logger.warn('No target device specified for simulator boot');
      return {
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      };
    }

    try {
      this.logger.debug('Booting iOS simulator', { targetDevice: state.targetDevice });

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'boot', state.targetDevice],
        {
          timeout: 60000,
          progressReporter,
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to boot simulator: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to boot simulator', new Error(errorMessage));
        this.logger.debug('Boot command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [
            `Failed to boot iOS simulator "${state.targetDevice}": ${errorMessage}`,
          ],
        };
      }

      this.logger.info('iOS simulator boot command completed', {
        targetDevice: state.targetDevice,
      });

      // Wait for simulator to be fully ready (boot command returns immediately, but simulator may not be ready)
      this.logger.debug('Waiting for simulator to be fully ready');
      await this.waitForSimulatorReady(state.targetDevice, progressReporter);

      this.logger.info('iOS simulator booted successfully and ready', {
        targetDevice: state.targetDevice,
      });
      return { simulatorRunning: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error booting simulator',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [
          `Failed to boot iOS simulator "${state.targetDevice}": ${errorMessage}`,
        ],
      };
    }
  };

  /**
   * Waits for the simulator to be fully ready after boot.
   * Polls the simulator status until it's booted and ready for operations.
   */
  private async waitForSimulatorReady(
    deviceName: string,
    progressReporter?: ProgressReporter,
    maxWaitTime: number = 120000,
    pollInterval: number = 2000
  ): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < maxWaitTime) {
      attempts++;
      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'list', 'devices', 'available'],
        {
          timeout: 10000,
          progressReporter,
        }
      );

      if (result.success) {
        // Check if device is booted
        const lines = result.stdout.split('\n');
        for (const line of lines) {
          if (line.includes(deviceName) && line.includes('(Booted)')) {
            this.logger.debug('Simulator is booted and ready', {
              deviceName,
              attempts,
              elapsedMs: Date.now() - startTime,
            });
            // Additional wait to ensure simulator is fully ready for operations
            await new Promise(resolve => setTimeout(resolve, 3000));
            return;
          }
        }
      }

      this.logger.debug('Simulator not ready yet, waiting...', {
        deviceName,
        attempts,
        elapsedMs: Date.now() - startTime,
      });
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Simulator "${deviceName}" did not become ready within ${maxWaitTime}ms after boot command`
    );
  }
}
