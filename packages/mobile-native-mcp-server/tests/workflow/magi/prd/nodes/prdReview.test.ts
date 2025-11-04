/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDReviewNode } from '../../../../../src/workflow/magi/prd/nodes/prdReview.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { PRD_REVIEW_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-review/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  getMagiPath: vi.fn(),
  MAGI_ARTIFACTS: {
    PRD: 'prd.md',
  },
}));

describe('PRDReviewNode', () => {
  let node: PRDReviewNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDReviewNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('prdReview');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke PRD review tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'PRD approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(PRD_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(PRD_REVIEW_TOOL.description);
    });

    it('should pass PRD file path to tool', () => {
      const prdFilePath = '/path/to/project/magi-sdd/feature-123/prd.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(prdFilePath);

      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'Approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.prdFilePath).toBe(prdFilePath);
    });

    it('should return approval status', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        approved: true,
        reviewSummary: 'PRD approved',
      });

      const result = node.execute(inputState);

      expect(result.isPrdApproved).toBe(true);
    });
  });

  describe('execute() - Resume Scenario', () => {
    it('should use userInput result when provided (resume scenario)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userInput: {
          approved: false,
          reviewSummary: 'Needs modifications',
        },
      });

      // Mock the tool executor to return the userInput result
      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        approved: false,
        reviewSummary: 'Needs modifications',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      const result = node.execute(inputState);

      expect(result.isPrdApproved).toBe(false);
    });
  });
});
