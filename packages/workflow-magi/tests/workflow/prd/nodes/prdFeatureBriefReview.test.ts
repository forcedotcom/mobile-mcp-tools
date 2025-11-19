/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefReviewNode } from '../../../../src/workflow/prd/nodes/prdFeatureBriefReview.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_REVIEW_TOOL } from '../../../../src/tools/prd/magi-prd-feature-brief-review/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief',
  },
}));

describe('PRDFeatureBriefReviewNode', () => {
  let node: PRDFeatureBriefReviewNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDFeatureBriefReviewNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('featureBriefReview');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke feature brief review tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_REVIEW_TOOL.description);
    });

    it('should pass feature brief path to tool', () => {
      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(featureBriefPath);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBriefPath).toBe(featureBriefPath);
    });
  });

  describe('execute() - Approval Handling', () => {
    it('should return approval state when approved', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
      });

      const result = node.execute(inputState);

      expect(result.isFeatureBriefApproved).toBe(true);
    });

    it('should return rejection state when not approved', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: false,
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
      });

      const result = node.execute(inputState);

      expect(result.isFeatureBriefApproved).toBe(false);
      expect(result.featureBriefModifications).toBeDefined();
      expect(result.featureBriefModifications?.length).toBe(1);
    });

    it('should not write file when not approved', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: false,
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
      });

      node.execute(inputState);

      expect(magiDirectory.writeMagiArtifact).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle missing feature brief gracefully', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
      });

      expect(() => node.execute(inputState)).not.toThrow();
    });

    it('should handle invalid approval state (modifications but approved=true)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
      });

      const result = node.execute(inputState);

      // Should force approved to false when modifications exist
      expect(result.isFeatureBriefApproved).toBe(false);
    });
  });
});
