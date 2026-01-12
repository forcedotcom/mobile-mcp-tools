/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { iOSBuildCommandFactory } from '../../../../src/execution/build/ios/buildCommandFactory.js';
import { PROGRESS_COMPLETE } from '../../../../src/execution/build/types.js';

describe('iOSBuildCommandFactory', () => {
  let factory: iOSBuildCommandFactory;

  beforeEach(() => {
    factory = new iOSBuildCommandFactory();
  });

  describe('create', () => {
    it('should create command with correct executable', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.executable).toBe('sh');
      expect(command.args).toContain('-c');
    });

    it('should include project path in command', () => {
      const params = {
        projectPath: '/custom/path',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain('/custom/path');
    });

    it('should include xcodebuild command with workspace', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain('xcodebuild');
      expect(command.args[1]).toContain('TestApp.xcworkspace');
    });

    it('should include scheme in command', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'MyApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain('-scheme MyApp');
    });

    it('should include destination in command', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain("destination 'generic/platform=iOS Simulator'");
    });

    it('should include clean build in command', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain('clean build');
    });

    it('should include CONFIGURATION_BUILD_DIR in command', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/custom/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain('CONFIGURATION_BUILD_DIR="/custom/output"');
    });

    it('should set cwd to project path', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.cwd).toBe('/path/to/project');
    });

    it('should set locale environment variables', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.env).toBeDefined();
      expect(command.env?.LANG).toBe('en_US.UTF-8');
      expect(command.env?.LC_ALL).toBe('en_US.UTF-8');
    });

    it('should preserve other environment variables', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.env).toBeDefined();
      // Should include original env plus locale vars
      expect(Object.keys(command.env || {})).toContain('LANG');
      expect(Object.keys(command.env || {})).toContain('LC_ALL');
    });
  });

  describe('parseProgress', () => {
    it('should increment progress on Compiling matches', () => {
      const output = 'Compiling ViewController.swift';
      const result = factory.parseProgress(output, 0);

      expect(result.progress).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should extract file name from Compiling match', () => {
      const output = 'Compiling ViewController.swift';
      const result = factory.parseProgress(output, 0);

      expect(result.message).toContain('ViewController.swift');
    });

    it('should increment progress on Linking matches', () => {
      const output = 'Linking TestApp';
      const result = factory.parseProgress(output, 0);

      expect(result.progress).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should increment progress on CodeSign matches', () => {
      const output = 'CodeSign TestApp.app';
      const result = factory.parseProgress(output, 0);

      expect(result.progress).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should set progress to complete on BUILD SUCCEEDED', () => {
      const output = 'BUILD SUCCEEDED';
      const result = factory.parseProgress(output, 50);

      expect(result.progress).toBe(PROGRESS_COMPLETE);
      expect(result.message).toBe('Build completed successfully');
    });

    it('should not update progress on BUILD FAILED', () => {
      const output = 'BUILD FAILED';
      const currentProgress = 50;
      const result = factory.parseProgress(output, currentProgress);

      expect(result.progress).toBe(currentProgress);
      expect(result.message).toBe('Build failed');
    });

    it('should handle multiple build steps', () => {
      const output = `Compiling ViewController.swift
Linking TestApp
CodeSign TestApp.app`;
      const result = factory.parseProgress(output, 0);

      expect(result.progress).toBeGreaterThan(0);
    });

    it('should use last match for message', () => {
      const output = `Compiling ViewController.swift
CodeSign TestApp.app`;
      const result = factory.parseProgress(output, 0);

      expect(result.message).toContain('TestApp.app');
    });

    it('should never decrease progress', () => {
      const output = 'Some output without matches';
      const currentProgress = 50;
      const result = factory.parseProgress(output, currentProgress);

      expect(result.progress).toBeGreaterThanOrEqual(currentProgress);
    });

    it('should handle empty output', () => {
      const result = factory.parseProgress('', 10);

      expect(result.progress).toBe(10);
    });

    it('should handle partial matches', () => {
      const output = 'Compiling';
      const result = factory.parseProgress(output, 0);

      expect(result.progress).toBeGreaterThanOrEqual(0);
    });
  });
});
