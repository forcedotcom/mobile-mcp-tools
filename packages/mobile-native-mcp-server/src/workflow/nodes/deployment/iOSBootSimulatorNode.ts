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
import { fetchSimulatorDevices, findSimulatorByName } from './simulatorUtils.js';

/**
 * Boots the target iOS simulator if it's not already running.
 * This node is idempotent - it handles "already booted" as success.
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

    if (!state.targetDevice) {
      this.logger.warn('No target device specified for simulator boot');
      return {
        workflowFatalErrorMessages: ['Target device must be specified for iOS deployment'],
      };
    }

    try {
      this.logger.debug('Attempting to boot iOS simulator', { targetDevice: state.targetDevice });

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
        // Check if it's already booted - this is SUCCESS, not failure
        const isAlreadyBooted = result.stderr?.includes(
          'Unable to boot device in current state: Booted'
        );

        if (isAlreadyBooted) {
          this.logger.info('Simulator already booted, verifying responsiveness', {
            targetDevice: state.targetDevice,
          });

          // Verify the simulator is actually responsive before proceeding
          const isResponsive = await this.verifySimulatorResponsive(
            state.targetDevice,
            progressReporter
          );
          if (!isResponsive) {
            this.logger.warn('Simulator is booted but not responsive, waiting for readiness');
            await this.waitForSimulatorReady(state.targetDevice, progressReporter);
          }

          // Ensure Simulator.app GUI is open so the user can see the simulator
          await this.openSimulatorApp(progressReporter);

          return {};
        }

        // Actual boot failure
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

      // Open the Simulator.app GUI so the user can see the simulator
      await this.openSimulatorApp(progressReporter);

      this.logger.info('iOS simulator booted successfully and ready', {
        targetDevice: state.targetDevice,
      });
      return {};
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
   * Verifies the simulator is not just booted, but actually responsive.
   */
  private async waitForSimulatorReady(
    deviceName: string,
    progressReporter?: ProgressReporter,
    maxWaitTime: number = 120000,
    pollInterval: number = 2000
  ): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: string | undefined;

    while (Date.now() - startTime < maxWaitTime) {
      attempts++;

      const result = await fetchSimulatorDevices(this.commandRunner, this.logger, {
        progressReporter,
        timeout: 10000,
      });

      if (!result.success) {
        lastError = result.error;
        this.logger.debug('Failed to list devices', { error: lastError, attempts });
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      const targetDevice = findSimulatorByName(result.devices, deviceName);

      if (targetDevice?.state === 'Booted') {
        this.logger.debug('Simulator is booted', {
          deviceName,
          udid: targetDevice.udid,
          iosVersion: targetDevice.iosVersion,
          attempts,
          elapsedMs: Date.now() - startTime,
        });

        // Verify simulator is actually responsive by running a simple command
        const isResponsive = await this.verifySimulatorResponsive(deviceName);
        if (isResponsive) {
          this.logger.debug('Simulator is responsive and ready for operations');
          return;
        }

        this.logger.debug('Simulator booted but not yet responsive, continuing to wait');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Simulator "${deviceName}" did not become ready within ${maxWaitTime}ms. Last error: ${lastError ?? 'Unknown'}`
    );
  }

  /**
   * Verifies the simulator is actually responsive by running a simple command.
   * This catches cases where the simulator is "Booted" but not yet accepting commands.
   */
  private async verifySimulatorResponsive(
    deviceName: string,
    progressReporter?: ProgressReporter
  ): Promise<boolean> {
    try {
      // Use 'simctl spawn' to run a simple command inside the simulator
      // 'launchctl print system' is a lightweight command that verifies responsiveness
      const result = await this.commandRunner.execute(
        'xcrun',
        ['simctl', 'spawn', deviceName, 'launchctl', 'print', 'system'],
        { timeout: 10000, progressReporter }
      );
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Opens the Simulator.app GUI so the user can see the running simulator.
   * Note: `simctl boot` boots the simulator headless; this opens the visual window.
   * This is idempotent - if Simulator.app is already open, it just brings it to focus.
   */
  private async openSimulatorApp(progressReporter?: ProgressReporter): Promise<void> {
    try {
      this.logger.debug('Opening Simulator.app GUI');

      const result = await this.commandRunner.execute('open', ['-a', 'Simulator'], {
        timeout: 10000,
        progressReporter,
      });

      if (!result.success) {
        // Non-fatal - simulator is still booted, user can open it manually
        this.logger.warn('Failed to open Simulator.app GUI', {
          stderr: result.stderr,
          exitCode: result.exitCode,
        });
        return;
      }

      this.logger.debug('Simulator.app GUI opened successfully');
    } catch (error) {
      // Non-fatal - simulator is still booted, user can open it manually
      this.logger.warn('Error opening Simulator.app GUI', {
        error: error instanceof Error ? error.message : `${error}`,
      });
    }
  }
}
