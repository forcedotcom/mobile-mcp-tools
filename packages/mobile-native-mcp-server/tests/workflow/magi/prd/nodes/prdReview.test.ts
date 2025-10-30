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
        prdContent: '# PRD\n\nContent',
        prdStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        prdApproved: true,
        reviewSummary: 'PRD approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(PRD_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(PRD_REVIEW_TOOL.description);
    });

    it('should pass PRD content and metadata to tool', () => {
      const prdContent = '# PRD\n\nComplete PRD content';
      const documentStatus = {
        author: 'AI Assistant',
        lastModified: '2025-01-01',
        status: 'draft' as const,
      };
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdContent,
        prdStatus: documentStatus,
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        prdApproved: true,
        reviewSummary: 'Approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.prdContent).toBe(prdContent);
      expect(lastCall?.input.documentStatus).toEqual(documentStatus);
    });

    it('should return approval status', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdContent: '# PRD',
        prdStatus: {
          author: 'AI',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_REVIEW_TOOL.toolId, {
        prdApproved: true,
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
          prdApproved: false,
          reviewSummary: 'Needs modifications',
        },
      });

      const result = node.execute(inputState);

      expect(result.isPrdApproved).toBe(false);
      expect(mockToolExecutor.getCallHistory().length).toBe(0); // Tool not called
    });
  });
});
