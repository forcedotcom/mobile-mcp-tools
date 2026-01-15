/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AndroidBuildCommandFactory } from '../../../../src/execution/build/android/buildCommandFactory.js';
import { PROGRESS_COMPLETE } from '../../../../src/execution/build/types.js';

describe('AndroidBuildCommandFactory', () => {
  let factory: AndroidBuildCommandFactory;

  beforeEach(() => {
    factory = new AndroidBuildCommandFactory();
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

    it('should include gradlew assemble command', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.args[1]).toContain('./gradlew assemble');
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

    it('should use process.env for environment', () => {
      const params = {
        projectPath: '/path/to/project',
        projectName: 'TestApp',
        buildOutputDir: '/output',
      };

      const command = factory.create(params);

      expect(command.env).toBe(process.env);
    });
  });

  describe('parseProgress', () => {
    describe('initialization phase', () => {
      it('should track Gradle daemon startup', () => {
        const output = 'Starting a Gradle Daemon (subsequent builds will be faster)';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toBe('Initializing Gradle daemon...');
      });
    });

    describe('configuration phase', () => {
      it('should track project configuration', () => {
        const output = '> Configure project :app';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toBe('Configuring project: app');
      });

      it('should track multiple project configurations', () => {
        const output = `> Configure project :app
> Configure project :libs:MobileSync`;
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toContain('Configuring project');
      });
    });

    describe('task execution', () => {
      it('should increment progress on task matches', () => {
        const output = '> Task :app:compileDebugJavaWithJavac';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toBeDefined();
      });

      it('should extract task information from match', () => {
        const output = '> Task :app:compileDebugJavaWithJavac';
        const result = factory.parseProgress(output, 0);

        expect(result.message).toContain('app');
        // Compile tasks show formatted message
        expect(result.message).toMatch(/Compiling|Building/);
      });

      it('should handle multiple task matches', () => {
        const output = `> Task :app:compileDebugJavaWithJavac
> Task :app:processDebugResources
> Task :app:packageDebug`;
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
      });

      it('should use last match for message', () => {
        const output = `> Task :app:compileDebugJavaWithJavac
> Task :app:packageDebug`;
        const result = factory.parseProgress(output, 0);

        // Package tasks show formatted message
        expect(result.message).toMatch(/Packaging|Building/);
        expect(result.message).toContain('app');
      });
    });

    describe('task completion indicators', () => {
      it('should track UP-TO-DATE tasks', () => {
        const output = '> Task :app:preBuild UP-TO-DATE';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        // Completion indicator pattern comes after general pattern, so it overrides
        expect(result.message).toContain('UP-TO-DATE');
        expect(result.message).toContain('app');
        expect(result.message).toContain('preBuild');
      });

      it('should track SKIPPED tasks', () => {
        const output = '> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toContain('SKIPPED');
      });

      it('should track NO-SOURCE tasks', () => {
        // For tasks without "compile" in name, completion indicator pattern matches
        const outputSimple = '> Task :app:processDebugAidl NO-SOURCE';
        const resultSimple = factory.parseProgress(outputSimple, 0);
        expect(resultSimple.progress).toBeGreaterThan(0);
        expect(resultSimple.message).toContain('NO-SOURCE');

        // For compile tasks with NO-SOURCE, compile pattern may match first
        // but completion indicator should still be tracked (pattern order dependent)
        const outputCompile = '> Task :app:compileDebugAidl NO-SOURCE';
        const resultCompile = factory.parseProgress(outputCompile, 0);
        expect(resultCompile.progress).toBeGreaterThan(0);
        // Compile pattern comes before completion indicator, so compile message wins
        // but progress is still tracked
      });
    });

    describe('compilation milestones', () => {
      it('should track compilation tasks with higher weight', () => {
        const output = '> Task :app:compileDebugKotlin';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toContain('Compiling');
      });

      it('should include variant in compilation message', () => {
        const output = '> Task :app:compileReleaseKotlin';
        const result = factory.parseProgress(output, 0);

        expect(result.message).toContain('Compiling');
        expect(result.message).toContain('Release');
      });
    });

    describe('packaging milestones', () => {
      it('should track packaging tasks with higher weight', () => {
        const output = '> Task :app:packageDebug';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThan(0);
        expect(result.message).toContain('Packaging');
      });

      it('should include variant in packaging message', () => {
        const output = '> Task :app:packageRelease';
        const result = factory.parseProgress(output, 0);

        expect(result.message).toContain('Packaging');
        expect(result.message).toContain('Release');
      });
    });

    describe('final assembly milestones', () => {
      it('should track debug assembly with highest weight', () => {
        const output = '> Task :app:assembleDebug';
        const result = factory.parseProgress(output, 50);

        expect(result.progress).toBeGreaterThan(50);
        // Assemble pattern captures "Debug" in group 1
        expect(result.message).toBe('Assembling Debug build...');
      });

      it('should track release assembly with highest weight', () => {
        const output = '> Task :app:assembleRelease';
        const result = factory.parseProgress(output, 50);

        expect(result.progress).toBeGreaterThan(50);
        // Assemble pattern captures "Release" in group 1
        expect(result.message).toBe('Assembling Release build...');
      });
    });

    describe('build completion', () => {
      it('should set progress to complete on BUILD SUCCESSFUL', () => {
        const output = 'BUILD SUCCESSFUL in 10s';
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
    });

    describe('edge cases', () => {
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

      it('should handle partial task output', () => {
        const output = '> Task :app:';
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBeGreaterThanOrEqual(0);
      });

      it('should handle complex build output with multiple phases', () => {
        const output = `Starting a Gradle Daemon
> Configure project :app
> Task :app:compileDebugKotlin
> Task :app:packageDebug
> Task :app:assembleDebug
BUILD SUCCESSFUL`;
        const result = factory.parseProgress(output, 0);

        expect(result.progress).toBe(PROGRESS_COMPLETE);
        expect(result.message).toBe('Build completed successfully');
      });
    });
  });
});
