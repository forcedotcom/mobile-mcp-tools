/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPProgressReporter } from '../../src/execution/progressReporter.js';

describe('ProgressReporter', () => {
  describe('MCPProgressReporter', () => {
    let mockSendNotification: ReturnType<typeof vi.fn>;
    const progressToken = 'test-token-123';

    beforeEach(() => {
      mockSendNotification = vi.fn().mockResolvedValue(undefined);
    });

    it('should implement ProgressReporter interface', () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      expect(reporter.report).toBeDefined();
      expect(typeof reporter.report).toBe('function');
    });

    it('should generate progress token when not provided', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification);
      reporter.report(50, 100, 'Test');

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have sent notifications with a generated token
      expect(mockSendNotification).toHaveBeenCalledTimes(2);
      const progressCall = mockSendNotification.mock.calls.find(
        call => call[0].method === 'notifications/progress'
      );
      expect(progressCall).toBeDefined();
      const generatedToken = progressCall![0].params.progressToken;
      expect(generatedToken).toBeDefined();
      expect(typeof generatedToken).toBe('string');
      expect(generatedToken.startsWith('progress-')).toBe(true);
    });

    it('should use provided progress token when available', async () => {
      const customToken = 'custom-token-456';
      const reporter = new MCPProgressReporter(mockSendNotification, customToken);
      reporter.report(50, 100, 'Test');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken: customToken,
          message: 'Test',
          progress: 50,
          total: 100,
        },
      });
    });

    it('should send progress notification with correct format', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(50, 100, 'Building...');

      // Wait for async notification
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledTimes(2); // One for logging message, one for progress
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/message',
        params: {
          level: 'info',
          data: 'Progress: 50%: Building...',
        },
      });
      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          message: 'Building...',
          progress: 50,
          total: 100,
        },
      });
    });

    it('should calculate percentage correctly', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(25, 100);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          message: 'Progress: 25%',
          progress: 25,
          total: 100,
        },
      });
    });

    it('should use default total of 100 when not provided', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(50);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          message: 'Progress: 50%',
          progress: 50,
          total: 100,
        },
      });
    });

    it('should handle zero total gracefully', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(50, 0);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          message: 'Progress: 0%',
          progress: 0,
          total: 100,
        },
      });
    });

    it('should round percentage correctly', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(33, 100);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          message: 'Progress: 33%',
          progress: 33,
          total: 100,
        },
      });
    });

    it('should handle notification errors gracefully', async () => {
      const failingSendNotification = vi.fn().mockRejectedValue(new Error('Network error'));
      const reporter = new MCPProgressReporter(failingSendNotification, progressToken);

      // Should not throw
      expect(() => {
        reporter.report(50, 100, 'Test');
      }).not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(failingSendNotification).toHaveBeenCalled();
    });

    it('should send both message and progress notifications', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(75, 100, 'Almost done');

      await new Promise(resolve => setTimeout(resolve, 10));

      const calls = mockSendNotification.mock.calls;
      expect(calls.length).toBe(2);
      expect(calls.some(call => call[0].method === 'notifications/message')).toBe(true);
      expect(calls.some(call => call[0].method === 'notifications/progress')).toBe(true);
    });

    it('should handle 100% progress correctly', async () => {
      const reporter = new MCPProgressReporter(mockSendNotification, progressToken);
      reporter.report(100, 100, 'Complete');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendNotification).toHaveBeenCalledWith({
        method: 'notifications/progress',
        params: {
          progressToken,
          message: 'Complete',
          progress: 100,
          total: 100,
        },
      });
    });
  });
});
