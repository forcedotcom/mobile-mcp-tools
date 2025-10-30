/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRDRequirementsIterationControlNode } from '../../../../../src/workflow/magi/prd/nodes/prdRequirementsIterationControl.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';

describe('PRDRequirementsIterationControlNode', () => {
  let node: PRDRequirementsIterationControlNode;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    node = new PRDRequirementsIterationControlNode(mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('requirementsIterationControl');
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new PRDRequirementsIterationControlNode();
      expect(nodeWithoutLogger['logger']).toBeUndefined();
    });
  });

  describe('execute() - Gap Score Threshold', () => {
    it('should iterate when score is below 0.8 (80%)', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 75, // 75%
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });

    it('should not iterate when score is above 0.8 (80%)', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 85, // 85%
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(false);
    });

    it('should iterate when score is exactly 0.8 (80%)', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 80, // 80%
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(false);
    });

    it('should normalize score from 0-100 to 0-1', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 75, // 75 out of 100
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });

    it('should handle score already normalized (0-1)', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 0.75, // Already normalized
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });
  });

  describe('execute() - User Override', () => {
    it('should iterate when user override is true', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 90, // Would normally not iterate
        userIterationOverride: true,
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });

    it('should not iterate when user override is false', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 70, // Would normally iterate
        userIterationOverride: false,
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(false);
    });

    it('should use threshold when user override is undefined', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 75,
        userIterationOverride: undefined,
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });

    it('should prioritize user override over score', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 95, // High score
        userIterationOverride: true, // But user wants to iterate
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle undefined gapAnalysisScore (defaults to 0)', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: undefined,
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true); // 0 < 0.8
    });

    it('should handle score of 0', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 0,
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(true);
    });

    it('should handle very high score (100)', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 100,
      });

      const result = node.execute(inputState);

      expect(result.shouldIterate).toBe(false);
    });

    it('should handle score greater than 100', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 150, // Greater than 100
      });

      const result = node.execute(inputState);

      // Should normalize to 1.5, which is > 0.8
      expect(result.shouldIterate).toBe(false);
    });
  });

  describe('execute() - Logging', () => {
    it('should log iteration decision', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 75,
        userIterationOverride: undefined,
      });

      mockLogger.reset();

      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      expect(infoLogs.some(log => log.message.includes('Iteration decision'))).toBe(true);
    });

    it('should log gap analysis score and decision', () => {
      const inputState = createPRDTestState({
        gapAnalysisScore: 75,
        userIterationOverride: false,
      });

      mockLogger.reset();

      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const decisionLog = infoLogs.find(log => log.message.includes('Iteration decision'));
      expect(decisionLog).toBeDefined();
      expect(decisionLog?.data).toHaveProperty('gapAnalysisScore', 75);
      expect(decisionLog?.data).toHaveProperty('shouldIterate', false);
    });
  });
});
