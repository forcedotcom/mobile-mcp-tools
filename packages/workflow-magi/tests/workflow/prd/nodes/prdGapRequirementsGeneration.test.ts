/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDGapRequirementsGenerationNode } from '../../../../src/workflow/prd/nodes/prdGapRequirementsGeneration.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { GAP_REQUIREMENTS_TOOL } from '../../../../src/tools/prd/magi-prd-gap-requirements/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief',
    REQUIREMENTS: 'requirements',
  },
}));

describe('PRDGapRequirementsGenerationNode', () => {
  let node: PRDGapRequirementsGenerationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDGapRequirementsGenerationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('gapRequirementsGeneration');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke gap requirements tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Gap',
            description: 'Description',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Impact',
            suggestedRequirements: [],
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path

      const updatedRequirementsMarkdown = '# Requirements\n\nUpdated';
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(GAP_REQUIREMENTS_TOOL.toolId, {
        updatedRequirementsMarkdown,
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(GAP_REQUIREMENTS_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(GAP_REQUIREMENTS_TOOL.description);
    });

    it('should pass gaps and requirements to tool', () => {
      const gaps = [
        {
          id: 'GAP-001',
          title: 'Gap 1',
          description: 'Description 1',
          severity: 'high' as const,
          category: 'Security',
          impact: 'Impact 1',
          suggestedRequirements: [],
        },
      ];

      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
        identifiedGaps: gaps,
      });

      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      vi.mocked(magiDirectory.getMagiPath)
        .mockReturnValueOnce(featureBriefPath) // feature brief path
        .mockReturnValueOnce(requirementsPath); // requirements path
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(GAP_REQUIREMENTS_TOOL.toolId, {
        updatedRequirementsMarkdown: '# Requirements\n\nUpdated',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.identifiedGaps).toEqual(gaps);
      expect(lastCall?.input.featureBriefPath).toBe(featureBriefPath);
      expect(lastCall?.input.requirementsPath).toBe(requirementsPath);
    });

    it('should write updated requirements markdown to file', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Gap',
            description: 'Description',
            severity: 'high' as const,
            category: 'Security',
            impact: 'Impact',
            suggestedRequirements: [],
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path

      const updatedRequirementsMarkdown = '# Requirements\n\nUpdated';
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(GAP_REQUIREMENTS_TOOL.toolId, {
        updatedRequirementsMarkdown,
      });

      const result = node.execute(inputState);

      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        updatedRequirementsMarkdown
      );
      expect(result).toEqual({});
    });
  });
});
