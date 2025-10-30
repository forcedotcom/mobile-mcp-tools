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
import * as fs from 'fs';
import * as path from 'path';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  resolveFeatureDirectory: vi.fn(),
  readMagiArtifact: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    REQUIREMENTS: 'requirements.md',
  },
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock path
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
  },
  join: vi.fn((...args) => args.join('/')),
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
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement 1',
            description: 'Description 1',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(REQUIREMENTS_REVIEW_TOOL.toolId, {
        approvedRequirements: [],
        rejectedRequirements: [],
        modifiedRequirements: [],
        reviewSummary: 'Review complete',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(REQUIREMENTS_REVIEW_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(REQUIREMENTS_REVIEW_TOOL.description);
    });

    it('should pass functional requirements to tool', () => {
      const requirements = [
        {
          id: 'REQ-001',
          title: 'Requirement 1',
          description: 'Description 1',
          priority: 'high' as const,
          category: 'UI/UX',
        },
        {
          id: 'REQ-002',
          title: 'Requirement 2',
          description: 'Description 2',
          priority: 'medium' as const,
          category: 'Security',
        },
      ];

      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        functionalRequirements: requirements,
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(REQUIREMENTS_REVIEW_TOOL.toolId, {
        approvedRequirements: [],
        rejectedRequirements: [],
        modifiedRequirements: [],
        reviewSummary: 'Summary',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.functionalRequirements).toEqual(requirements);
    });

    it('should write requirements markdown file', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      mockToolExecutor.setResult(REQUIREMENTS_REVIEW_TOOL.toolId, {
        approvedRequirements: [
          {
            id: 'REQ-001',
            title: 'Requirement',
            description: 'Description',
            priority: 'high' as const,
            category: 'UI/UX',
          },
        ],
        rejectedRequirements: [],
        modifiedRequirements: [],
        reviewSummary: 'Approved',
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalled();
    });
  });

  describe('execute() - Resume Scenario', () => {
    it('should use userInput result when provided (resume scenario)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userInput: {
          approvedRequirements: [
            {
              id: 'REQ-001',
              title: 'Requirement',
              description: 'Description',
              priority: 'high' as const,
              category: 'UI/UX',
            },
          ],
          reviewSummary: 'Resume review',
        },
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      node.execute(inputState);

      expect(mockToolExecutor.getCallHistory().length).toBe(0); // Tool not called
      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalled();
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
