/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BuildValidationService } from '../../../src/workflow/services/buildValidationService.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { BUILD_TOOL } from '../../../src/tools/plan/sfmobile-native-build/metadata.js';

describe('BuildValidationService', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let service: BuildValidationService;

  const testParams = {
    platform: 'iOS' as const,
    projectPath: '/Users/test/MyApp',
    projectName: 'MyApp',
  };

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    service = new BuildValidationService(mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should use provided tool executor', () => {
      expect(service['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(service['logger']).toBe(mockLogger);
    });

    it('should create default dependencies when none provided', () => {
      const serviceWithDefaults = new BuildValidationService();
      expect(serviceWithDefaults['toolExecutor']).toBeDefined();
      expect(serviceWithDefaults['logger']).toBeDefined();
    });
  });

  describe('executeBuild - Successful Build', () => {
    it('should return success on successful build', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      const result = service.executeBuild(testParams);

      expect(result.buildSuccessful).toBe(true);
      expect(result.buildOutputFilePath).toBeUndefined();
    });

    it('should invoke build tool with correct parameters', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      service.executeBuild(testParams);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(BUILD_TOOL.toolId);
      expect(lastCall?.input.platform).toBe(testParams.platform);
      expect(lastCall?.input.projectPath).toBe(testParams.projectPath);
      expect(lastCall?.input.projectName).toBe(testParams.projectName);
    });

    it('should handle iOS successful build', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      const result = service.executeBuild({
        ...testParams,
        platform: 'iOS',
      });

      expect(result.buildSuccessful).toBe(true);
    });

    it('should handle Android successful build', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      const result = service.executeBuild({
        ...testParams,
        platform: 'Android',
      });

      expect(result.buildSuccessful).toBe(true);
    });
  });

  describe('executeBuild - Build Failure', () => {
    it('should return failure with output file path', () => {
      const buildOutputPath = '/tmp/build-output.txt';

      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: false,
        buildOutputFilePath: buildOutputPath,
      });

      const result = service.executeBuild(testParams);

      expect(result.buildSuccessful).toBe(false);
      expect(result.buildOutputFilePath).toBe(buildOutputPath);
    });

    it('should handle iOS build failure', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: false,
        buildOutputFilePath: '/tmp/ios-build-output.txt',
      });

      const result = service.executeBuild({
        ...testParams,
        platform: 'iOS',
      });

      expect(result.buildSuccessful).toBe(false);
      expect(result.buildOutputFilePath).toBeDefined();
    });

    it('should handle Android build failure', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: false,
        buildOutputFilePath: '/tmp/android-build-output.txt',
      });

      const result = service.executeBuild({
        ...testParams,
        platform: 'Android',
      });

      expect(result.buildSuccessful).toBe(false);
      expect(result.buildOutputFilePath).toBeDefined();
    });
  });

  describe('executeBuild - Logging', () => {
    it('should log build execution start', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      mockLogger.reset();
      service.executeBuild(testParams);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const startLog = infoLogs.find(log => log.message.includes('Executing build'));

      expect(startLog).toBeDefined();
    });

    it('should log build completion', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      mockLogger.reset();
      service.executeBuild(testParams);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const completionLog = infoLogs.find(log => log.message.includes('Build completed'));

      expect(completionLog).toBeDefined();
    });

    it('should log build success status', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      mockLogger.reset();
      service.executeBuild(testParams);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const completionLog = infoLogs.find(log => log.message.includes('Build completed'));

      expect(completionLog?.data).toMatchObject({
        buildSuccessful: true,
      });
    });
  });

  describe('executeBuild - Real World Scenarios', () => {
    it('should handle Contact List app iOS build', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      const result = service.executeBuild({
        platform: 'iOS',
        projectPath: '/Users/developer/ContactListApp-iOS',
        projectName: 'ContactListApp',
      });

      expect(result.buildSuccessful).toBe(true);
    });

    it('should handle Contact List app Android build', () => {
      mockToolExecutor.setResult(BUILD_TOOL.toolId, {
        buildSuccessful: true,
      });

      const result = service.executeBuild({
        platform: 'Android',
        projectPath: '/home/developer/ContactListApp-Android',
        projectName: 'ContactListApp',
      });

      expect(result.buildSuccessful).toBe(true);
    });
  });
});
