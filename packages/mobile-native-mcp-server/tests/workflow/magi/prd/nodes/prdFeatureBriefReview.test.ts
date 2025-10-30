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
import * as fs from 'fs';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  readMagiArtifact: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
  },
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
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
        featureBriefContent: '# Feature Brief\n\nContent',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Feature brief approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_REVIEW_TOOL.description);
    });

    it('should pass feature brief content from state to tool', () => {
      const featureBriefContent = '# Feature Brief\n\nTest content';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent,
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBrief).toBe(featureBriefContent);
    });

    it('should read feature brief from file if not in state', () => {
      const fileContent = '# Feature Brief from File';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: undefined,
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(fileContent);
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
      });

      node.execute(inputState);

      expect(wellKnownDirectory.readMagiArtifact).toHaveBeenCalled();
      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBrief).toBe(fileContent);
    });
  });

  describe('execute() - Approval Handling', () => {
    it('should write feature brief file when approved', () => {
      const featureBriefContent = '# Feature Brief\n\nContent';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent,
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Feature brief approved',
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalled();
    });

    it('should return approval state when approved', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
        userFeedback: 'Looks good!',
      });

      const result = node.execute(inputState);

      expect(result.isFeatureBriefApproved).toBe(true);
      expect(result.featureBriefUserFeedback).toBe('Looks good!');
    });

    it('should return rejection state when not approved', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

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
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: false,
        reviewSummary: 'Not approved',
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).not.toHaveBeenCalled();
    });
  });

  describe('execute() - Resume Scenario', () => {
    it('should use userInput result when provided (resume scenario)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userInput: {
          approved: true,
          reviewSummary: 'Approved via resume',
        },
      });

      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      const result = node.execute(inputState);

      expect(result.isFeatureBriefApproved).toBe(true);
      expect(mockToolExecutor.getCallHistory().length).toBe(0); // Tool not called
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty feature brief content', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(FEATURE_BRIEF_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBrief).toBe('');
    });

    it('should handle invalid approval state (modifications but approved=true)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

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
