/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BuildRecoveryService } from '../../../src/workflow/services/buildRecoveryService.js';
import { MockToolExecutor } from '../../utils/MockToolExecutor.js';
import { MockLogger } from '../../utils/MockLogger.js';
import { BUILD_RECOVERY_TOOL } from '../../../src/tools/plan/sfmobile-native-build-recovery/metadata.js';

describe('BuildRecoveryService', () => {
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;
  let service: BuildRecoveryService;

  const testParams = {
    platform: 'iOS' as const,
    projectPath: '/Users/test/MyApp',
    projectName: 'MyApp',
    buildOutputFilePath: '/tmp/build-output.txt',
    attemptNumber: 1,
  };

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    service = new BuildRecoveryService(mockToolExecutor, mockLogger);
  });

  describe('Constructor', () => {
    it('should use provided tool executor', () => {
      expect(service['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(service['logger']).toBe(mockLogger);
    });

    it('should create default dependencies when none provided', () => {
      const serviceWithDefaults = new BuildRecoveryService();
      expect(serviceWithDefaults['toolExecutor']).toBeDefined();
      expect(serviceWithDefaults['logger']).toBeDefined();
    });
  });

  describe('attemptRecovery - Successful Recovery', () => {
    it('should return fixes and ready for retry', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: ['Fixed code signing', 'Ran pod install'],
        readyForRetry: true,
      });

      const result = service.attemptRecovery(testParams);

      expect(result.fixesAttempted).toEqual(['Fixed code signing', 'Ran pod install']);
      expect(result.readyForRetry).toBe(true);
    });

    it('should invoke recovery tool with correct parameters', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: ['Fix applied'],
        readyForRetry: true,
      });

      service.attemptRecovery(testParams);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall).toBeDefined();
      expect(lastCall?.llmMetadata.name).toBe(BUILD_RECOVERY_TOOL.toolId);
      expect(lastCall?.input.platform).toBe(testParams.platform);
      expect(lastCall?.input.projectPath).toBe(testParams.projectPath);
      expect(lastCall?.input.projectName).toBe(testParams.projectName);
      expect(lastCall?.input.buildOutputFilePath).toBe(testParams.buildOutputFilePath);
      expect(lastCall?.input.attemptNumber).toBe(testParams.attemptNumber);
    });
  });

  describe('attemptRecovery - Recovery Unable to Help', () => {
    it('should return no fixes and not ready for retry', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: [],
        readyForRetry: false,
      });

      const result = service.attemptRecovery(testParams);

      expect(result.fixesAttempted).toEqual([]);
      expect(result.readyForRetry).toBe(false);
    });
  });

  describe('attemptRecovery - Platform Specific', () => {
    it('should handle iOS recovery', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: ['Ran pod install'],
        readyForRetry: true,
      });

      const result = service.attemptRecovery({
        ...testParams,
        platform: 'iOS',
      });

      expect(result.fixesAttempted).toContain('Ran pod install');
    });

    it('should handle Android recovery', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: ['Updated Gradle dependencies'],
        readyForRetry: true,
      });

      const result = service.attemptRecovery({
        ...testParams,
        platform: 'Android',
      });

      expect(result.fixesAttempted).toContain('Updated Gradle dependencies');
    });
  });

  describe('attemptRecovery - Logging', () => {
    it('should log recovery attempt start', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: ['Fix'],
        readyForRetry: true,
      });

      mockLogger.reset();
      service.attemptRecovery(testParams);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const startLog = infoLogs.find(log => log.message.includes('Attempting build recovery'));

      expect(startLog).toBeDefined();
    });

    it('should log recovery completion', () => {
      mockToolExecutor.setResult(BUILD_RECOVERY_TOOL.toolId, {
        fixesAttempted: ['Fix'],
        readyForRetry: true,
      });

      mockLogger.reset();
      service.attemptRecovery(testParams);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const completionLog = infoLogs.find(log => log.message.includes('Build recovery completed'));

      expect(completionLog).toBeDefined();
    });
  });
});
