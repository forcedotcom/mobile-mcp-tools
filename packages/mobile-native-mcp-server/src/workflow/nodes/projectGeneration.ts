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
import { State } from '../metadata.js';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { MOBILE_SDK_TEMPLATES_PATH } from '../../common.js';

export class ProjectGenerationNode extends BaseNode<State> {
  protected readonly logger: Logger;
  private readonly commandRunner: CommandRunner;

  constructor(commandRunner: CommandRunner, logger?: Logger) {
    super('generateProject');
    this.logger = logger ?? createComponentLogger('ProjectGenerationNode');
    this.commandRunner = commandRunner;
  }

  execute = async (state: State, config?: WorkflowRunnableConfig): Promise<Partial<State>> => {
    try {
      const platformLower = state.platform.toLowerCase();

      // Build template properties flags if they exist
      const templatePropertiesArgs: string[] = [];
      if (state.templateProperties && Object.keys(state.templateProperties).length > 0) {
        for (const [key, value] of Object.entries(state.templateProperties)) {
          templatePropertiesArgs.push(`--template-property-${key}`, value);
        }
      }

      // Build command arguments array
      // Note: No quotes needed - spawn() handles spaces in arguments correctly
      const args = [
        'mobilesdk',
        platformLower,
        'createwithtemplate',
        '--templatesource',
        MOBILE_SDK_TEMPLATES_PATH,
        '--template',
        state.selectedTemplate,
        '--appname',
        state.projectName,
        '--packagename',
        state.packageName,
        '--organization',
        state.organization,
      ];

      // Add connected app credentials only for MSDK apps (when they exist in state)
      if (state.connectedAppClientId) {
        args.push('--consumerkey', state.connectedAppClientId);
      }
      if (state.connectedAppCallbackUri) {
        args.push('--callbackurl', state.connectedAppCallbackUri);
      }
      if (state.loginHost) {
        args.push('--loginserver', state.loginHost);
      }

      // Add template properties for AgentSDK apps
      args.push(...templatePropertiesArgs);

      this.logger.debug('Executing project generation command', {
        template: state.selectedTemplate,
        templateSource: MOBILE_SDK_TEMPLATES_PATH,
        projectName: state.projectName,
        platform: state.platform,
        packageName: state.packageName,
        organization: state.organization,
        // Only log connected app credentials if present (MSDK apps)
        ...(state.connectedAppClientId && { connectedAppClientId: state.connectedAppClientId }),
        ...(state.connectedAppCallbackUri && { connectedAppCallbackUri: state.connectedAppCallbackUri }),
        ...(state.loginHost && { loginHost: state.loginHost }),
        templateProperties: state.templateProperties,
      });

      // Get progress reporter from config (passed by orchestrator)
      const progressReporter = config?.configurable?.progressReporter;

      // Execute the command using CommandRunner
      const result = await this.commandRunner.execute('sf', args, {
        timeout: 120000,
        cwd: process.cwd(),
        progressReporter,
        commandName: 'Project Generation',
      });

      if (!result.success) {
        const errorMessage =
          result.stderr ||
          `Command failed with exit code ${result.exitCode ?? 'unknown'}${
            result.signal ? ` (signal: ${result.signal})` : ''
          }`;
        this.logger.error('Project generation command failed', new Error(errorMessage));
        this.logger.debug('Command execution details', {
          exitCode: result.exitCode ?? null,
          signal: result.signal ?? null,
          stderr: result.stderr,
          stdout: result.stdout,
        });
        return {
          workflowFatalErrorMessages: [
            `Failed to generate project: ${errorMessage}. Please ensure the Salesforce Mobile SDK CLI is properly installed and configured.`,
          ],
        };
      }

      this.logger.debug('Command executed successfully', {
        outputLength: result.stdout.length,
        hasOutput: result.stdout.trim().length > 0,
        duration: result.duration,
      });

      // Determine project path (the CLI creates the project in the current working directory)
      const projectPath = resolve(process.cwd(), state.projectName);

      // Verify project directory was created
      if (!existsSync(projectPath)) {
        this.logger.error(
          `Project directory not found after command execution. Expected path: ${projectPath}`
        );
        return {
          workflowFatalErrorMessages: [
            `Project directory not found at ${projectPath}. The command executed successfully but the project was not created in the expected location.`,
          ],
        };
      }

      // Validate project structure based on platform
      if (state.platform === 'Android') {
        const isValidAndroidProject = this.validateAndroidProjectStructure(projectPath);
        if (!isValidAndroidProject) {
          return {
            workflowFatalErrorMessages: [
              `Generated project at ${projectPath} is not a valid Android project. Missing required files or directories.`,
            ],
          };
        }
        this.logger.debug('Android project structure validation passed', { projectPath });
      } else if (state.platform === 'iOS') {
        const isValidiOSProject = this.validateiOSProjectStructure(projectPath);
        if (!isValidiOSProject) {
          return {
            workflowFatalErrorMessages: [
              `Generated project at ${projectPath} is not a valid iOS project. Missing required files or directories.`,
            ],
          };
        }
        this.logger.debug('iOS project structure validation passed', { projectPath });
      }

      // Log success only after all validation passes
      this.logger.info('Project generation completed successfully', {
        projectPath,
        platform: state.platform,
      });

      return {
        projectPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${error}`;
      if (error instanceof Error) {
        this.logger.error('Project generation failed', error);
      } else {
        this.logger.error(`Project generation failed: ${errorMessage}`);
      }
      return {
        workflowFatalErrorMessages: [
          `Failed to generate project: ${errorMessage}. Please ensure the Salesforce Mobile SDK CLI is properly installed and configured.`,
        ],
      };
    }
  };

  /**
   * Validates that the generated Android project has the required structure and files
   */
  private validateAndroidProjectStructure(projectPath: string): boolean {
    const requiredFiles = [
      // Root level Gradle files
      'build.gradle',
      'settings.gradle',
      // App module
      'app',
      'app/build.gradle',
    ];

    // Also check for Kotlin alternatives
    const alternativeFiles = [
      ['build.gradle', 'build.gradle.kts'],
      ['settings.gradle', 'settings.gradle.kts'],
      ['app/build.gradle', 'app/build.gradle.kts'],
    ];

    // Check that all required files/directories exist (with alternatives)
    for (const requiredFile of requiredFiles) {
      const fullPath = join(projectPath, requiredFile);

      // Skip files that have alternatives - we'll check them separately
      const hasAlternative = alternativeFiles.some(alt => alt[0] === requiredFile);
      if (hasAlternative) {
        continue;
      }

      if (!existsSync(fullPath)) {
        this.logger.warn('Missing required Android project file/directory', {
          path: fullPath,
        });
        return false;
      }
    }

    // Check files with alternatives - at least one version must exist
    for (const [groovyFile, kotlinFile] of alternativeFiles) {
      const groovyPath = join(projectPath, groovyFile);
      const kotlinPath = join(projectPath, kotlinFile);

      if (!existsSync(groovyPath) && !existsSync(kotlinPath)) {
        this.logger.warn('Missing required Android project file (checked both Groovy and Kotlin)', {
          groovyPath,
          kotlinPath,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Validates that the generated iOS project has the required structure and files
   */
  private validateiOSProjectStructure(projectPath: string): boolean {
    // Check for .xcodeproj directory (required)
    let foundXcodeproj = false;
    try {
      const files = readdirSync(projectPath);
      for (const file of files) {
        if (file.endsWith('.xcodeproj')) {
          const fullPath = join(projectPath, file);
          if (existsSync(fullPath)) {
            foundXcodeproj = true;
            break;
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to read iOS project directory', { projectPath, error });
      return false;
    }

    if (!foundXcodeproj) {
      this.logger.warn('Missing required .xcodeproj directory in iOS project', {
        projectPath,
      });
      return false;
    }

    return true;
  }
}
