/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// TODO: This tool needs further consideration for our server tool design pattern. It's basically
// wired up to the data structures, but has no LLM exeuction prompt and is in need of
// consideration for how that should be implemented.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import * as path from 'path';
import {
  Logger,
  FileSystemOperations,
  NodeFileSystemOperations,
} from '@salesforce/magen-mcp-workflow';
import { XCODE_ADD_FILES_TOOL, XcodeAddFilesWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

interface XcodeAddFilesResult {
  success: boolean;
  command: string;
  projectPath: string;
  filePaths: string[];
  targetName?: string;
  message: string;
  error?: string;
}

export class UtilsXcodeAddFilesTool extends AbstractNativeProjectManagerTool<
  typeof XCODE_ADD_FILES_TOOL
> {
  private readonly fs: FileSystemOperations;

  constructor(
    server: McpServer,
    logger?: Logger,
    fileSystemOperations: FileSystemOperations = new NodeFileSystemOperations()
  ) {
    super(server, XCODE_ADD_FILES_TOOL, 'XcodeAddFilesTool', logger);
    this.fs = fileSystemOperations;
  }

  public handleRequest = async (input: XcodeAddFilesWorkflowInput) => {
    try {
      const result = await this.addFilesToXcodeProject(input);

      // Validate the result against the output schema
      const validatedResult = this.toolMetadata.resultSchema.parse(result);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(validatedResult, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorResult: XcodeAddFilesResult = {
        success: false,
        command: '',
        projectPath: '',
        filePaths: [],
        message: 'Failed to generate command for adding files to Xcode project',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };

      // Validate the error result against the output schema
      const validatedErrorResult = this.toolMetadata.resultSchema.parse(errorResult);

      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(validatedErrorResult, null, 2),
          },
        ],
      };
    }
  };

  private async addFilesToXcodeProject(
    input: XcodeAddFilesWorkflowInput
  ): Promise<XcodeAddFilesResult> {
    const { projectPath, xcodeProjectPath, newFilePaths, targetName } = input;

    // Construct full path to xcodeproj file
    const fullXcodeProjectPath = path.resolve(projectPath, xcodeProjectPath);
    const pbxprojPath = path.join(fullXcodeProjectPath, 'project.pbxproj');

    // Validate inputs
    if (!this.fs.existsSync(pbxprojPath)) {
      throw new Error(`Project file not found: ${pbxprojPath}`);
    }

    // Prepare arguments
    const absoluteFilePaths = newFilePaths.map(filePath =>
      path.isAbsolute(filePath) ? filePath : path.resolve(projectPath, filePath)
    );

    // Build the inline Ruby command using xcodeproj gem
    const rubyCode = this.buildInlineRubyCode(fullXcodeProjectPath, targetName, absoluteFilePaths);
    const command = `ruby -e "${rubyCode}"`;

    return {
      success: true,
      command,
      projectPath: fullXcodeProjectPath,
      filePaths: absoluteFilePaths,
      targetName,
      message: `Generated command to add ${newFilePaths.length} files to Xcode project`,
    };
  }

  private buildInlineRubyCode(
    projectPath: string,
    targetName: string | undefined,
    filePaths: string[]
  ): string {
    // Escape strings for shell
    const escapeForShell = (str: string) => str.replace(/"/g, '\\"').replace(/'/g, "\\'");

    const escapedProjectPath = escapeForShell(projectPath);
    const escapedTargetName = targetName ? `'${escapeForShell(targetName)}'` : 'nil';
    const escapedFilePaths = filePaths.map(fp => `'${escapeForShell(fp)}'`).join(', ');

    return dedent`
      require 'xcodeproj'
      require 'json'
      require 'pathname'

      begin
        project_path = '${escapedProjectPath}'
        target_name = ${escapedTargetName}
        files_to_add = [${escapedFilePaths}]

        unless File.exist?(project_path)
          puts JSON.generate({
            success: false,
            error: 'Project file not found',
            message: "Could not find Xcode project at #{project_path}"
          })
          exit 1
        end

        project = Xcodeproj::Project.open(project_path)
        target = target_name ? project.targets.find { |t| t.name == target_name } : project.targets.first

        unless target
          puts JSON.generate({
            success: false,
            error: 'Target not found',
            message: target_name ? "Could not find target '#{target_name}'" : 'No targets found in project'
          })
          exit 1
        end

        files_added = []
        files_failed = []

        files_to_add.each do |file_path|
          unless File.exist?(file_path)
            files_failed << file_path
            next
          end

          begin
            project_dir = File.dirname(project_path)
            relative_path = Pathname.new(file_path).relative_path_from(Pathname.new(project_dir)).to_s
            file_ref = project.main_group.new_file(relative_path)
            
            file_ext = File.extname(file_path).downcase
            source_extensions = ['.swift', '.m', '.mm', '.c', '.cpp', '.cc', '.cxx']
            
            if source_extensions.include?(file_ext)
              target.source_build_phase.add_file_reference(file_ref)
            end
            
            files_added << File.basename(file_path)
          rescue => e
            files_failed << "#{file_path}: #{e.message}"
          end
        end

        project.save

        result = {
          success: true,
          filesAdded: files_added,
          target: target.name,
          buildStatus: 'completed',
          message: "Successfully added #{files_added.length} files to Xcode project"
        }
        
        if files_failed.any?
          result[:warnings] = "Failed to add #{files_failed.length} files: #{files_failed.join(', ')}"
        end

        puts JSON.generate(result)

      rescue => e
        puts JSON.generate({
          success: false,
          error: e.class.name,
          message: e.message
        })
        exit 1
      end
    `;
  }
}
