/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDRequirementsReviewNode } from '../../../../../src/workflow/magi/prd/nodes/prdRequirementsReview.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { REQUIREMENTS_REVIEW_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-requirements-review/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  getMagiPath: vi.fn(),
  MAGI_ARTIFACTS: {
    REQUIREMENTS: 'requirements.md',
  },
}));

describe('PRDRequirementsReviewNode', () => {
  let node: PRDRequirementsReviewNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDRequirementsReviewNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('requirementsReview');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke requirements review tool with correct metadata', () => {
      const requirementsContent = '# Requirements\n\n## Status\n**Status**: draft';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );

      mockToolExecutor.setResult(REQUIREMENTS_REVIEW_TOOL.toolId, {
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(REQUIREMENTS_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(REQUIREMENTS_REVIEW_TOOL.description);
    });

    it('should pass requirements path to tool', () => {
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(requirementsPath);

      mockToolExecutor.setResult(REQUIREMENTS_REVIEW_TOOL.toolId, {
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.requirementsPath).toBe(requirementsPath);
    });

    it('should return review results', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );

      mockToolExecutor.setResult(REQUIREMENTS_REVIEW_TOOL.toolId, {
        approvedRequirementIds: ['REQ-001', 'REQ-003'],
        rejectedRequirementIds: ['REQ-002'],
        modifications: [
          {
            requirementId: 'REQ-004',
            modificationReason: 'Needs clarification',
            requestedChanges: {
              description: 'Updated description',
            },
          },
        ],
      });

      const result = node.execute(inputState);

      expect(result.approvedRequirementIds).toEqual(['REQ-001', 'REQ-003']);
      expect(result.rejectedRequirementIds).toEqual(['REQ-002']);
      expect(result.requirementModifications).toBeDefined();
    });
  });

  describe('execute() - Validation Errors', () => {
    it('should throw error when projectPath is missing', () => {
      const inputState = createPRDTestState({
        projectPath: undefined,
        featureId: 'feature-123',
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow();
    });

    it('should throw error when featureId is missing', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: undefined,
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow();
    });
  });
});
