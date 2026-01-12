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
import { State } from '../../metadata.js';

/**
 * Lists available Android emulators/devices.
 */
export class AndroidListDevicesNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('androidListDevices');
    this.logger = logger ?? createComponentLogger('AndroidListDevicesNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    if (state.platform !== 'Android') {
      this.logger.debug('Skipping Android device listing for non-Android platform');
      return {};
    }

    try {
      this.logger.debug('Listing Android devices');

      const progressReporter = config?.configurable?.progressReporter;

      const result = await this.commandRunner.execute(
        'sf',
        ['force', 'lightning', 'local', 'device', 'list', '-p', 'android'],
        {
          timeout: 30000,
          progressReporter,
        }
      );

      if (!result.success) {
        const errorMessage =
          result.stderr || `Failed to list devices: exit code ${result.exitCode ?? 'unknown'}`;
        this.logger.error('Failed to list Android devices', new Error(errorMessage));
        this.logger.debug('List devices command details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [`Failed to list Android devices: ${errorMessage}`],
        };
      }

      this.logger.debug('Android devices listed successfully', {
        output: result.stdout,
      });
      // Store device list output in state for potential use by other nodes
      return { androidDeviceList: result.stdout };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      this.logger.error(
        'Error listing Android devices',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return {
        workflowFatalErrorMessages: [`Failed to list Android devices: ${errorMessage}`],
      };
    }
  };
}
