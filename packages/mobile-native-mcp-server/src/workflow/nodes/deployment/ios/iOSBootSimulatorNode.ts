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
} from '@salesforce/magen-mcp-workflow';
import { State } from '../../../metadata.js';
import { waitForSimulatorReady, openSimulatorApp, bootIOSSimulator } from './simulatorUtils.js';

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

    const progressReporter = config?.configurable?.progressReporter;
    const deviceName = state.targetDevice;

    const bootResult = await bootIOSSimulator(this.commandRunner, this.logger, {
      deviceName,
      progressReporter,
    });

    if (!bootResult.success) {
      return {
        workflowFatalErrorMessages: [bootResult.error],
      };
    }

    // Wait for simulator to be fully ready
    this.logger.debug('Waiting for simulator to be fully ready');
    const readyResult = await waitForSimulatorReady(this.commandRunner, this.logger, deviceName, {
      progressReporter,
    });

    if (!readyResult.success) {
      this.logger.error(
        'Simulator did not become ready',
        new Error(readyResult.error ?? 'Unknown error')
      );
      return {
        workflowFatalErrorMessages: [readyResult.error ?? 'Simulator did not become ready'],
      };
    }

    // Open Simulator.app GUI (non-fatal if fails)
    await openSimulatorApp(this.commandRunner, this.logger, progressReporter);

    this.logger.info('iOS simulator booted successfully and ready', { targetDevice: deviceName });
    return {};
  };
}
