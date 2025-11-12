/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'path';
import { UtilsXcodeAddFilesTool } from '../../../../src/tools/utils/utils-xcode-add-files/tool.js';
import { MockFileSystemOperations } from '../../../utils/MockFileSystemProvider.js';

describe('UtilsXcodeAddFilesTool', () => {
  let tool: UtilsXcodeAddFilesTool;
  let mockServer: McpServer;
  let mockFileSystem: MockFileSystemOperations;

  beforeEach(() => {
    mockServer = new McpServer({ name: 'test-server', version: '1.0.0' });
    mockFileSystem = new MockFileSystemOperations();
    tool = new UtilsXcodeAddFilesTool(mockServer, undefined, mockFileSystem);
  });

  describe('Tool Metadata', () => {
    it('should have correct tool properties', () => {
      expect(tool.toolMetadata.toolId).toBe('utils-xcode-add-files');
      expect(tool.toolMetadata.title).toBe('Xcode Project File Addition Utility');
      expect(tool.toolMetadata.description).toBe(
        'Generates a Ruby command using the xcodeproj gem to add files to Xcode projects'
      );
    });

    it('should have input schema with required fields', () => {
      const schema = tool.toolMetadata.inputSchema;
      expect(schema).toBeDefined();
      expect(schema.shape).toBeDefined();
      expect(schema.shape.projectPath).toBeDefined();
      expect(schema.shape.xcodeProjectPath).toBeDefined();
      expect(schema.shape.newFilePaths).toBeDefined();
      expect(schema.shape.targetName).toBeDefined();
    });

    it('should register without throwing errors', () => {
      const mockAnnotations = {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      };

      expect(() => tool.register(mockAnnotations)).not.toThrow();
    });
  });

  describe('Ruby Command Generation', () => {
    it('should generate Ruby command for valid Xcode project', async () => {
      const validInput = {
        projectPath: path.resolve('/path/to/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: ['NewFile.swift', 'AnotherFile.swift'],
        targetName: 'MyApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      // Mock the project file as existing
      mockFileSystem.addExistingFile(
        path.resolve('/path/to/project/MyApp.xcodeproj/project.pbxproj')
      );

      const result = await tool.handleRequest(validInput);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.success).toBe(true);
      expect(resultData.command).toContain('ruby -e');
      expect(resultData.command).toContain('xcodeproj');
      expect(resultData.projectPath).toBe(path.resolve('/path/to/project/MyApp.xcodeproj'));
      expect(resultData.filePaths).toEqual([
        path.resolve('/path/to/project/NewFile.swift'),
        path.resolve('/path/to/project/AnotherFile.swift'),
      ]);
      expect(resultData.targetName).toBe('MyApp');
    });

    it('should handle absolute file paths', async () => {
      const inputWithAbsolutePaths = {
        projectPath: path.resolve('/project/root'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: [
          path.resolve('/absolute/path/File1.swift'),
          path.join('relative', 'File2.swift'),
        ],
        targetName: 'MyApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      mockFileSystem.addExistingFile(path.resolve('/project/root/MyApp.xcodeproj/project.pbxproj'));

      const result = await tool.handleRequest(inputWithAbsolutePaths);
      const resultData = JSON.parse(result.content[0].text);

      expect(resultData.success).toBe(true);
      expect(resultData.filePaths).toEqual([
        path.resolve('/absolute/path/File1.swift'),
        path.resolve('/project/root/relative/File2.swift'),
      ]);
    });

    it('should handle optional target name', async () => {
      const inputWithoutTarget = {
        projectPath: path.resolve('/path/to/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: ['NewFile.swift'],
        workflowStateData: { thread_id: 'test-123' },
      };

      mockFileSystem.addExistingFile(
        path.resolve('/path/to/project/MyApp.xcodeproj/project.pbxproj')
      );

      const result = await tool.handleRequest(inputWithoutTarget);
      const resultData = JSON.parse(result.content[0].text);

      expect(resultData.success).toBe(true);
      expect(resultData.targetName).toBeUndefined();
    });

    it('should generate proper Ruby code with file escaping', async () => {
      const inputWithSpecialChars = {
        projectPath: path.resolve('/path/to/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: ['File With Spaces.swift', "File'With'Quotes.swift"],
        targetName: 'MyApp Target',
        workflowStateData: { thread_id: 'test-123' },
      };

      mockFileSystem.addExistingFile(
        path.resolve('/path/to/project/MyApp.xcodeproj/project.pbxproj')
      );

      const result = await tool.handleRequest(inputWithSpecialChars);
      const resultData = JSON.parse(result.content[0].text);

      expect(resultData.success).toBe(true);
      expect(resultData.command).toContain('ruby -e');
      // Verify that the command contains escaped strings
      expect(resultData.command).toContain('File With Spaces.swift');
      expect(resultData.command).toContain("File\\'With\\'Quotes.swift");
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project file', async () => {
      const input = {
        projectPath: path.resolve('/nonexistent/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: ['NewFile.swift'],
        targetName: 'MyApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      // Don't add the project file to mock filesystem (it won't exist)

      const result = await tool.handleRequest(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project file not found');
    });

    it('should handle empty file paths array', async () => {
      const input = {
        projectPath: path.resolve('/path/to/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: [],
        targetName: 'MyApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      mockFileSystem.addExistingFile(
        path.resolve('/path/to/project/MyApp.xcodeproj/project.pbxproj')
      );

      const result = await tool.handleRequest(input);
      const resultData = JSON.parse(result.content[0].text);

      expect(resultData.success).toBe(true);
      expect(resultData.filePaths).toEqual([]);
    });
  });

  describe('Ruby Code Generation', () => {
    it('should include proper Ruby gem requirements', async () => {
      const input = {
        projectPath: path.resolve('/path/to/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: ['NewFile.swift'],
        targetName: 'MyApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      mockFileSystem.addExistingFile(
        path.resolve('/path/to/project/MyApp.xcodeproj/project.pbxproj')
      );

      const result = await tool.handleRequest(input);
      const resultData = JSON.parse(result.content[0].text);

      // Verify the Ruby command includes necessary gem requirements
      expect(resultData.command).toContain("require 'xcodeproj'");
      expect(resultData.command).toContain("require 'json'");
      expect(resultData.command).toContain("require 'pathname'");
    });

    it('should include error handling in Ruby code', async () => {
      const input = {
        projectPath: path.resolve('/path/to/project'),
        xcodeProjectPath: 'MyApp.xcodeproj',
        newFilePaths: ['NewFile.swift'],
        targetName: 'MyApp',
        workflowStateData: { thread_id: 'test-123' },
      };

      mockFileSystem.addExistingFile(
        path.resolve('/path/to/project/MyApp.xcodeproj/project.pbxproj')
      );

      const result = await tool.handleRequest(input);
      const resultData = JSON.parse(result.content[0].text);

      // Verify the Ruby command includes error handling
      expect(resultData.command).toContain('rescue => e');
      expect(resultData.command).toContain('puts JSON.generate');
      expect(resultData.command).toContain('exit 1');
    });
  });
});
