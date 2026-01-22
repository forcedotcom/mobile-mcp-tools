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
import { gte } from 'semver';

// Constants for execSync configuration
const EXEC_SYNC_TIMEOUT = 10000;
const EXEC_SYNC_MAX_BUFFER = 2 * 1024 * 1024;

const PLUGIN_INFO_SCHEMA = z.object({
  name: z.string(),
  version: z.string(),
  type: z.string().optional(),
});

type PluginInfo = z.infer<typeof PLUGIN_INFO_SCHEMA>;

// Configuration to define the required plugin.
interface PluginConfig {
  name: string;
  minimumVersion: string;
  installTag?: string;
}

const REQUIRED_PLUGINS: readonly PluginConfig[] = [
  {
    name: 'sfdx-mobilesdk-plugin',
    minimumVersion: '13.2.0-alpha.1',
    installTag: '@alpha',
  },
  {
    name: '@salesforce/lwc-dev-mobile',
    minimumVersion: '3.0.0-alpha.3',
  },
] as const;

export class PluginCheckNode extends BaseNode<State> {
  protected readonly logger: Logger;

  constructor(logger?: Logger) {
    super('checkPluginSetup');
    this.logger = logger ?? createComponentLogger('PluginCheckNode');
  }

  execute = (_state: State): Partial<State> => {
    const errorMessages: string[] = [];
    let allPluginsValid = true;

    // Check all required plugins
    for (const pluginConfig of REQUIRED_PLUGINS) {
      const result = this.checkPlugin(pluginConfig);
      if (!result.success) {
        allPluginsValid = false;
        errorMessages.push(...result.errorMessages);
      }
    }

    if (allPluginsValid) {
      return {
        validPluginSetup: true,
      };
    }

    return {
      validPluginSetup: false,
      workflowFatalErrorMessages: errorMessages,
    };
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

  private isVersionSufficient(version: string, minimumVersion: string): boolean {
    try {
      return gte(version, minimumVersion);
    } catch (error) {
      // If version parsing fails, log and return false to be safe
      this.logger.warn(`Failed to parse version for comparison: ${version}`, { error });
      return false;
    }
  }

  private inspectPlugin(config: PluginConfig): PluginInfo {
    const inspectCommand = `sf plugins inspect ${config.name} --json`;
    const output = execSync(inspectCommand, {
      encoding: 'utf-8',
      timeout: EXEC_SYNC_TIMEOUT,
      maxBuffer: EXEC_SYNC_MAX_BUFFER,
    });
    return this.parsePluginOutput(output);
  }

  private installOrUpgradePlugin(
    config: PluginConfig,
    operation: 'install' | 'upgrade'
  ): Partial<State> {
    try {
      // Pipe "y" to automatically answer the trust prompt
      const installCommand = `echo "y" | sf plugins install ${config.name}${config.installTag ?? ''}`;
      const operationVerb = operation === 'install' ? 'Installing' : 'Upgrading';
      this.logger.debug(`${operationVerb} plugin`, {
        command: installCommand,
        plugin: config.name,
      });

      execSync(installCommand, {
        encoding: 'utf-8',
        timeout: EXEC_SYNC_TIMEOUT,
        maxBuffer: EXEC_SYNC_MAX_BUFFER,
      });

      // Verify installation/upgrade
      const pluginInfo = this.inspectPlugin(config);

      if (!this.isVersionSufficient(pluginInfo.version, config.minimumVersion)) {
        const operationPast = operation === 'install' ? 'installed' : 'upgraded';
        return {
          validPluginSetup: false,
          workflowFatalErrorMessages: [
            `${config.name}: Plugin ${operationPast} but version ${pluginInfo.version} is below minimum ${config.minimumVersion}`,
          ],
        };
      }

      const operationPast = operation === 'install' ? 'installed' : 'upgraded';
      this.logger.info(`Plugin successfully ${operationPast}`, {
        plugin: config.name,
        version: pluginInfo.version,
      });
      return {
        validPluginSetup: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        validPluginSetup: false,
        workflowFatalErrorMessages: [
          `${config.name}: Failed to ${operation} plugin: ${errorMessage}`,
        ],
      };
    }
  }

  private checkPlugin(config: PluginConfig): { success: boolean; errorMessages: string[] } {
    try {
      const inspectCommand = `sf plugins inspect ${config.name} --json`;
      this.logger.debug(`Checking plugin installation`, {
        command: inspectCommand,
        plugin: config.name,
      });

      let pluginInfo: PluginInfo;

      try {
        pluginInfo = this.inspectPlugin(config);
      } catch (_error) {
        // Plugin not installed, attempt to install it
        this.logger.info(`Plugin not installed, attempting installation`, { plugin: config.name });
        const installResult = this.installOrUpgradePlugin(config, 'install');
        return {
          success: installResult.validPluginSetup === true,
          errorMessages: installResult.workflowFatalErrorMessages || [],
        };
      }

      // Check version
      if (!this.isVersionSufficient(pluginInfo.version, config.minimumVersion)) {
        this.logger.info(
          `Plugin version ${pluginInfo.version} is below minimum ${config.minimumVersion}, attempting upgrade`,
          { plugin: config.name }
        );
        const upgradeResult = this.installOrUpgradePlugin(config, 'upgrade');
        return {
          success: upgradeResult.validPluginSetup === true,
          errorMessages: upgradeResult.workflowFatalErrorMessages || [],
        };
      }

      // Plugin is installed and version is sufficient
      this.logger.debug(`Plugin check passed`, {
        plugin: config.name,
        version: pluginInfo.version,
      });
      return {
        success: true,
        errorMessages: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      return {
        success: false,
        errorMessages: [`${config.name}: Error during plugin check: ${errorMessage}`],
      };
    }
  }
}
