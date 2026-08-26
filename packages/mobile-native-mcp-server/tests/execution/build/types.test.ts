/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  parseProgressWithPatterns,
  PROGRESS_COMPLETE,
  PROGRESS_FAILURE,
  PROGRESS_MAX_BEFORE_COMPLETE,
  type ProgressPattern,
} from '../../../src/execution/build/types.js';

describe('parseProgressWithPatterns', () => {
  describe('basic functionality', () => {
    it('should return current progress when no patterns match', () => {
      const patterns: ProgressPattern[] = [{ pattern: /notfound/g, weight: 1 }];
      const result = parseProgressWithPatterns('some output', 10, patterns, () => 'test');

      expect(result.progress).toBe(10);
      expect(result.message).toBeUndefined();
    });

    it('should increment progress when pattern matches', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 5 }];
      const output = 'Running task';
      const result = parseProgressWithPatterns(output, 10, patterns, match => `Found: ${match[0]}`);

      expect(result.progress).toBeGreaterThan(10);
      expect(result.message).toBe('Found: task');
    });

    it('should never decrease progress', () => {
      const patterns: ProgressPattern[] = [{ pattern: /nothing/g, weight: 1 }];
      const result = parseProgressWithPatterns('output', 50, patterns, () => 'test');

      expect(result.progress).toBe(50);
    });
  });

  describe('progress completion', () => {
    it('should set progress to PROGRESS_COMPLETE when completion pattern matches', () => {
      const patterns: ProgressPattern[] = [
        { pattern: /BUILD SUCCESSFUL/g, weight: PROGRESS_COMPLETE },
      ];
      const output = 'BUILD SUCCESSFUL';
      const result = parseProgressWithPatterns(output, 50, patterns, () => 'test');

      expect(result.progress).toBe(PROGRESS_COMPLETE);
      expect(result.message).toBe('Build completed successfully');
    });

    it('should stop processing after completion pattern', () => {
      const patterns: ProgressPattern[] = [
        { pattern: /BUILD SUCCESSFUL/g, weight: PROGRESS_COMPLETE },
        { pattern: /other/g, weight: 1 },
      ];
      const output = 'BUILD SUCCESSFUL and other';
      const result = parseProgressWithPatterns(output, 50, patterns, () => 'test');

      expect(result.progress).toBe(PROGRESS_COMPLETE);
      expect(result.message).toBe('Build completed successfully');
    });
  });

  describe('progress failure', () => {
    it('should not update progress when failure pattern matches', () => {
      const patterns: ProgressPattern[] = [{ pattern: /BUILD FAILED/g, weight: PROGRESS_FAILURE }];
      const output = 'BUILD FAILED';
      const result = parseProgressWithPatterns(output, 50, patterns, () => 'test');

      expect(result.progress).toBe(50); // Progress unchanged
      expect(result.message).toBe('Build failed');
    });

    it('should stop processing after failure pattern', () => {
      const patterns: ProgressPattern[] = [
        { pattern: /BUILD FAILED/g, weight: PROGRESS_FAILURE },
        { pattern: /other/g, weight: 1 },
      ];
      const output = 'BUILD FAILED and other';
      const result = parseProgressWithPatterns(output, 50, patterns, () => 'test');

      expect(result.progress).toBe(50);
      expect(result.message).toBe('Build failed');
    });
  });

  describe('progress increment', () => {
    it('should increment progress based on weight and match count', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 10 }];
      const output = 'task task task';
      const result = parseProgressWithPatterns(output, 0, patterns, match => `Task: ${match[0]}`);

      // 3 matches * 10 weight = 30, but capped at PROGRESS_MAX_BEFORE_COMPLETE
      expect(result.progress).toBeLessThanOrEqual(PROGRESS_MAX_BEFORE_COMPLETE);
      expect(result.progress).toBeGreaterThan(0);
      expect(result.message).toBe('Task: task');
    });

    it('should cap progress at PROGRESS_MAX_BEFORE_COMPLETE', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 50 }];
      const output = 'task task task';
      const result = parseProgressWithPatterns(output, 0, patterns, () => 'test');

      // Starting at 0, with 3 matches * 50 weight = 150, but should cap at PROGRESS_MAX_BEFORE_COMPLETE
      // increment = Math.min(150, 100) = 100, newProgress = Math.min(100, 95) = 95
      expect(result.progress).toBeLessThanOrEqual(PROGRESS_MAX_BEFORE_COMPLETE);
      expect(result.progress).toBe(PROGRESS_MAX_BEFORE_COMPLETE);
    });

    it('should not exceed current progress + increment limit', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 50 }];
      const output = 'task';
      const result = parseProgressWithPatterns(output, 80, patterns, () => 'test');

      // Should not exceed PROGRESS_MAX_BEFORE_COMPLETE (95)
      expect(result.progress).toBeLessThanOrEqual(PROGRESS_MAX_BEFORE_COMPLETE);
    });

    it('should use last match for message formatting', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task(\d+)/g, weight: 5 }];
      const output = 'task1 task2 task3';
      const result = parseProgressWithPatterns(output, 0, patterns, match => `Task ${match[1]}`);

      expect(result.message).toBe('Task 3'); // Last match
    });
  });

  describe('multiple patterns', () => {
    it('should process patterns in order', () => {
      const patterns: ProgressPattern[] = [
        { pattern: /step1/g, weight: 10 },
        { pattern: /step2/g, weight: 20 },
        { pattern: /BUILD SUCCESSFUL/g, weight: PROGRESS_COMPLETE },
      ];
      const output = 'step1 step2 BUILD SUCCESSFUL';
      const result = parseProgressWithPatterns(output, 0, patterns, match => match[0]);

      expect(result.progress).toBe(PROGRESS_COMPLETE);
      expect(result.message).toBe('Build completed successfully');
    });

    it('should handle multiple matches across patterns', () => {
      const patterns: ProgressPattern[] = [
        { pattern: /compile/g, weight: 5 },
        { pattern: /link/g, weight: 10 },
      ];
      const output = 'compile compile link';
      const result = parseProgressWithPatterns(output, 0, patterns, match => match[0]);

      expect(result.progress).toBeGreaterThan(0);
    });
  });

  describe('regex patterns', () => {
    it('should handle global regex patterns', () => {
      const patterns: ProgressPattern[] = [{ pattern: /\d+/g, weight: 1 }];
      const output = 'Progress 10 20 30';
      const result = parseProgressWithPatterns(output, 0, patterns, match => match[0]);

      expect(result.progress).toBeGreaterThan(0);
    });

    it('should handle capture groups in patterns', () => {
      const patterns: ProgressPattern[] = [{ pattern: /File: (\S+)/g, weight: 1 }];
      const output = 'File: test.swift File: main.swift';
      const result = parseProgressWithPatterns(output, 0, patterns, match => match[1]);

      expect(result.message).toBe('main.swift'); // Last match's capture group
    });

    it('should handle patterns with no capture groups', () => {
      const patterns: ProgressPattern[] = [{ pattern: /BUILD/g, weight: 1 }];
      const output = 'BUILD';
      const result = parseProgressWithPatterns(output, 0, patterns, match => match[0]);

      expect(result.message).toBe('BUILD');
    });
  });

  describe('edge cases', () => {
    it('should handle empty output', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 1 }];
      const result = parseProgressWithPatterns('', 10, patterns, () => 'test');

      expect(result.progress).toBe(10);
    });

    it('should handle zero current progress', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 5 }];
      const result = parseProgressWithPatterns('task', 0, patterns, () => 'test');

      expect(result.progress).toBeGreaterThan(0);
    });

    it('should handle progress at maximum', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 1 }];
      const result = parseProgressWithPatterns(
        'task',
        PROGRESS_MAX_BEFORE_COMPLETE,
        patterns,
        () => 'test'
      );

      expect(result.progress).toBe(PROGRESS_MAX_BEFORE_COMPLETE);
    });

    it('should handle very large weight values', () => {
      const patterns: ProgressPattern[] = [{ pattern: /task/g, weight: 1000 }];
      const output = 'task';
      const result = parseProgressWithPatterns(output, 0, patterns, () => 'test');

      expect(result.progress).toBeLessThanOrEqual(PROGRESS_MAX_BEFORE_COMPLETE);
    });
  });
});
