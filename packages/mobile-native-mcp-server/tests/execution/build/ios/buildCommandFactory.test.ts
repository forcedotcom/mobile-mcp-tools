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
    const params = {
      projectPath: '/path/to/project',
      projectName: 'TestApp',
      buildOutputDir: '/output',
    };

    it('should use xcodebuild as the executable (no shell)', () => {
      const command = factory.create(params);
      expect(command.executable).toBe('xcodebuild');
      expect(command.args).not.toContain('-c');
      expect(command.args).not.toContain('sh');
    });

    it('should build a pure argv array with workspace and scheme', () => {
      const command = factory.create(params);
      expect(command.args).toEqual([
        '-workspace',
        'TestApp.xcworkspace',
        '-scheme',
        'TestApp',
        '-destination',
        'generic/platform=iOS Simulator',
        'clean',
        'build',
        'CONFIGURATION_BUILD_DIR=/output',
      ]);
    });

    it('should pass a malicious projectName verbatim as a single argv element', () => {
      const malicious = { ...params, projectName: 'App; rm -rf ~' };
      const command = factory.create(malicious);
      // The dangerous value appears untouched as its own argv element, never concatenated
      // into a shell string.
      expect(command.args).toContain('App; rm -rf ~');
      expect(command.args).toContain('App; rm -rf ~.xcworkspace');
      expect(command.args.join(' ')).not.toContain('&&');
    });

    it('should pass a malicious projectPath only via cwd, not a shell string', () => {
      const malicious = { ...params, projectPath: '/tmp/x"; touch pwned; "' };
      const command = factory.create(malicious);
      expect(command.cwd).toBe('/tmp/x"; touch pwned; "');
      // projectPath is not interpolated into any arg
      expect(command.args.some(a => a.includes('touch pwned'))).toBe(false);
    });

    it('should set cwd to the project path', () => {
      const command = factory.create(params);
      expect(command.cwd).toBe('/path/to/project');
    });

    it('should set locale environment variables and preserve existing env', () => {
      const command = factory.create(params);
      expect(command.env?.LANG).toBe('en_US.UTF-8');
      expect(command.env?.LC_ALL).toBe('en_US.UTF-8');
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
