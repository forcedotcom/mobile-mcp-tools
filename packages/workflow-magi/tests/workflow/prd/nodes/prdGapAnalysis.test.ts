/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDGapAnalysisNode } from '../../../../src/workflow/prd/nodes/prdGapAnalysis.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { GAP_ANALYSIS_TOOL } from '../../../../src/tools/prd/magi-prd-gap-analysis/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief',
    REQUIREMENTS: 'requirements',
  },
}));

describe('PRDGapAnalysisNode', () => {
  let node: PRDGapAnalysisNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDGapAnalysisNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('gapAnalysis');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke gap analysis tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path

      mockToolExecutor.setResult(GAP_ANALYSIS_TOOL.toolId, {
        gapAnalysisEvaluation: 'Good',
        identifiedGaps: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(GAP_ANALYSIS_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(GAP_ANALYSIS_TOOL.description);
    });

    it('should pass feature brief and requirements to tool', () => {
      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath)
        .mockReturnValueOnce(featureBriefPath) // feature brief path
        .mockReturnValueOnce(requirementsPath); // requirements path

      mockToolExecutor.setResult(GAP_ANALYSIS_TOOL.toolId, {
        gapAnalysisEvaluation: 'Good',
        identifiedGaps: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBriefPath).toBe(featureBriefPath);
      expect(lastCall?.input.requirementsPath).toBe(requirementsPath);
    });

    it('should return gap analysis results', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path

      const gaps = [
        {
          id: 'GAP-001',
          title: 'Missing authentication',
          description: 'No auth requirements',
          severity: 'high' as const,
          category: 'Security',
          impact: 'Security risk',
          suggestedRequirements: [],
        },
      ];

      mockToolExecutor.setResult(GAP_ANALYSIS_TOOL.toolId, {
        gapAnalysisEvaluation: 'Good',
        identifiedGaps: gaps,
      });

      const result = node.execute(inputState);

      // The schema transform converts 'Good' to score 75
      expect(result.gapAnalysisScore).toBe(75);
      expect(result.identifiedGaps).toEqual(gaps);
    });
  });
});
