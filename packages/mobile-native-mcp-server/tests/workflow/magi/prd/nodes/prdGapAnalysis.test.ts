/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDGapAnalysisNode } from '../../../../../src/workflow/magi/prd/nodes/prdGapAnalysis.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { GAP_ANALYSIS_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-gap-analysis/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  readMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
    REQUIREMENTS: 'requirements.md',
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
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements\n\nREQ-001');

      mockToolExecutor.setResult(GAP_ANALYSIS_TOOL.toolId, {
        gapAnalysisScore: 75,
        identifiedGaps: [],
        requirementStrengths: [],
        recommendations: [],
        summary: 'Gap analysis complete',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(GAP_ANALYSIS_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(GAP_ANALYSIS_TOOL.description);
    });

    it('should pass feature brief and requirements to tool', () => {
      const featureBrief = '# Feature Brief\n\nContent';
      const requirements = '# Requirements\n\nREQ-001: Requirement';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: featureBrief,
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(requirements);

      mockToolExecutor.setResult(GAP_ANALYSIS_TOOL.toolId, {
        gapAnalysisScore: 80,
        identifiedGaps: [],
        requirementStrengths: [],
        recommendations: [],
        summary: 'Summary',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBrief).toBe(featureBrief);
      expect(lastCall?.input.requirementsContent).toBe(requirements);
    });

    it('should return gap analysis results', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements');

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
        gapAnalysisScore: 75,
        identifiedGaps: gaps,
        requirementStrengths: [],
        recommendations: [],
        summary: 'Gaps found',
        userWantsToContinueDespiteGaps: true,
      });

      const result = node.execute(inputState);

      expect(result.gapAnalysisScore).toBe(75);
      expect(result.identifiedGaps).toEqual(gaps);
      expect(result.userIterationOverride).toBe(true);
    });
  });

  describe('execute() - Resume Scenario', () => {
    it('should use userInput result when provided (resume scenario)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userInput: {
          gapAnalysisScore: 80,
          summary: 'Resume gap analysis',
          identifiedGaps: [],
        },
      });

      const result = node.execute(inputState);

      expect(result.gapAnalysisScore).toBe(80);
      expect(mockToolExecutor.getCallHistory().length).toBe(0); // Tool not called
    });
  });
});
