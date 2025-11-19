/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode, createComponentLogger, Logger } from '@salesforce/magen-mcp-workflow';
import z from 'zod';
import { execSync } from 'child_process';

const PLUGIN_INFO_SCHEMA = z.object({
  name: z.string(),
  version: z.string(),
  type: z.string().optional(),
});

type PluginInfo = z.infer<typeof PLUGIN_INFO_SCHEMA>;

const MINIMUM_PLUGIN_VERSION = '13.1.0';
const PLUGIN_NAME = 'sfdx-mobilesdk-plugin';

export class PluginCheckNode extends BaseNode<State> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('checkPluginSetup');
    this.logger = logger ?? createComponentLogger('PluginCheckNode');
  }

  execute = (_state: State): Partial<State> => {
    try {
      // First, check if plugin is installed
      const inspectCommand = `sf plugins inspect ${PLUGIN_NAME} --json`;

      this.logger.debug(`Checking plugin installation`, { command: inspectCommand });

      let pluginInfo: PluginInfo;

      try {
        const output = execSync(inspectCommand, { encoding: 'utf-8', timeout: 10000 });
        pluginInfo = this.parsePluginOutput(output);
      } catch (_error) {
        // Plugin not installed, attempt to install it
        this.logger.info(`Plugin not installed, attempting installation`);
        return this.installPlugin();
      }

      // Check version
      if (!this.isVersionSufficient(pluginInfo.version)) {
        this.logger.info(
          `Plugin version ${pluginInfo.version} is below minimum ${MINIMUM_PLUGIN_VERSION}, attempting upgrade`
        );
        return this.upgradePlugin();
      }

      // Plugin is installed and version is sufficient
      this.logger.debug(`Plugin check passed`, { version: pluginInfo.version });
      return {
        validPluginSetup: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        validPluginSetup: false,
        workflowFatalErrorMessages: [`Error during plugin check: ${errorMessage}`],
      };
    }
  };

  private parsePluginOutput(output: string): PluginInfo {
    try {
      const parsed = JSON.parse(output);

      // The sf plugins inspect command returns different structures
      // Try to extract the plugin info from various possible structures
      let pluginData = parsed;

      // If it's wrapped in a result property
      if (parsed.result) {
        pluginData = parsed.result;
      }

      // If it's an array, get the first element
      if (Array.isArray(pluginData)) {
        pluginData = pluginData[0];
      }

      return PLUGIN_INFO_SCHEMA.parse(pluginData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      throw new Error(`Failed to parse plugin info: ${errorMessage}`);
    }
  }

  private isVersionSufficient(version: string): boolean {
    const parseVersion = (v: string): number[] => {
      return v.split('.').map(part => parseInt(part, 10) || 0);
    };

    const current = parseVersion(version);
    const minimum = parseVersion(MINIMUM_PLUGIN_VERSION);

    for (let i = 0; i < Math.max(current.length, minimum.length); i++) {
      const currentPart = current[i] || 0;
      const minimumPart = minimum[i] || 0;

      if (currentPart > minimumPart) return true;
      if (currentPart < minimumPart) return false;
    }

    return true; // versions are equal
  }

  private installPlugin(): Partial<State> {
    try {
      const installCommand = `sf plugins install ${PLUGIN_NAME}`;
      this.logger.debug(`Installing plugin`, { command: installCommand });

      execSync(installCommand, { encoding: 'utf-8', timeout: 60000 });

      // Verify installation
      const inspectCommand = `sf plugins inspect ${PLUGIN_NAME} --json`;
      const output = execSync(inspectCommand, { encoding: 'utf-8', timeout: 10000 });
      const pluginInfo = this.parsePluginOutput(output);

      if (!this.isVersionSufficient(pluginInfo.version)) {
        return {
          validPluginSetup: false,
          workflowFatalErrorMessages: [
            `Plugin installed but version ${pluginInfo.version} is below minimum ${MINIMUM_PLUGIN_VERSION}`,
          ],
        };
      }

      this.logger.info(`Plugin successfully installed`, { version: pluginInfo.version });
      return {
        validPluginSetup: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        validPluginSetup: false,
        workflowFatalErrorMessages: [`Failed to install plugin: ${errorMessage}`],
      };
    }
  }

  private upgradePlugin(): Partial<State> {
    try {
      const updateCommand = `sf plugins update ${PLUGIN_NAME}`;
      this.logger.debug(`Upgrading plugin`, { command: updateCommand });

      execSync(updateCommand, { encoding: 'utf-8', timeout: 60000 });

      // Verify upgrade
      const inspectCommand = `sf plugins inspect ${PLUGIN_NAME} --json`;
      const output = execSync(inspectCommand, { encoding: 'utf-8', timeout: 10000 });
      const pluginInfo = this.parsePluginOutput(output);

      if (!this.isVersionSufficient(pluginInfo.version)) {
        return {
          validPluginSetup: false,
          workflowFatalErrorMessages: [
            `Plugin upgraded but version ${pluginInfo.version} is still below minimum ${MINIMUM_PLUGIN_VERSION}`,
          ],
        };
      }

      this.logger.info(`Plugin successfully upgraded`, { version: pluginInfo.version });
      return {
        validPluginSetup: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        validPluginSetup: false,
        workflowFatalErrorMessages: [`Failed to upgrade plugin: ${errorMessage}`],
      };
    }
  }
}
