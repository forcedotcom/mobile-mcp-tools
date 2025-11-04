/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefReviewNode } from '../../../../../src/workflow/magi/prd/nodes/prdFeatureBriefReview.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_REVIEW_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-feature-brief-review/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  readMagiArtifact: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
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
      const featureBriefContent = '# Feature Brief\n\nContent';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Feature brief approved',
        updatedFeatureBrief: '# Feature Brief\n\n## Status\n**Status**: approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_REVIEW_TOOL.description);
    });

    it('should pass feature brief content from file to tool', () => {
      const featureBriefContent = '# Feature Brief\n\nTest content';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
        updatedFeatureBrief: '# Feature Brief\n\n## Status\n**Status**: approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBrief).toBe(featureBriefContent);
    });
  });

  describe('execute() - Approval Handling', () => {
    it('should write updated feature brief file when approved', () => {
      const featureBriefContent = '# Feature Brief\n\nContent';
      const updatedContent = '# Feature Brief\n\n## Status\n**Status**: approved\n\nContent';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Feature brief approved',
        updatedFeatureBrief: updatedContent,
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        updatedContent
      );
    });

    it('should return approval state when approved', () => {
      const featureBriefContent = '# Feature Brief';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
        userFeedback: 'Looks good!',
        updatedFeatureBrief: '# Feature Brief\n\n## Status\n**Status**: approved',
      });

      const result = node.execute(inputState);

      expect(result.isFeatureBriefApproved).toBe(true);
      expect(result.featureBriefUserFeedback).toBe('Looks good!');
    });

    it('should return rejection state when not approved', () => {
      const featureBriefContent = '# Feature Brief';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: false,
        reviewSummary: 'Needs modifications',
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
      const featureBriefContent = '# Feature Brief';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: false,
        reviewSummary: 'Not approved',
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should throw error when feature brief file not found', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      expect(() => {
        node.execute(inputState);
      }).toThrow('Feature brief file not found');
    });

    it('should handle invalid approval state (modifications but approved=true)', () => {
      const featureBriefContent = '# Feature Brief';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true, // Invalid: approved but has modifications
        reviewSummary: 'Approved',
        modifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs detail',
            requestedContent: 'More content',
          },
        ],
      });

      const result = node.execute(inputState);

      // Should be corrected to false
      expect(result.isFeatureBriefApproved).toBe(false);
    });
  });
});
