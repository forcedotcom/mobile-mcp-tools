/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDGapRequirementsGenerationNode } from '../../../../../src/workflow/magi/prd/nodes/prdGapRequirementsGeneration.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { GAP_REQUIREMENTS_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-gap-requirements/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  readMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
    REQUIREMENTS: 'requirements.md',
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

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements');

      mockToolExecutor.setResult(GAP_REQUIREMENTS_TOOL.toolId, {
        functionalRequirements: [],
        summary: 'Requirements generated',
        gapsAddressed: ['GAP-001'],
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

      const requirementsContent = '# Requirements';
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(requirementsContent);

      mockToolExecutor.setResult(GAP_REQUIREMENTS_TOOL.toolId, {
        functionalRequirements: [],
        summary: 'Summary',
        gapsAddressed: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.identifiedGaps).toEqual(gaps);
      expect(lastCall?.input.requirementsContent).toBe(requirementsContent);
    });

    it('should return functional requirements', () => {
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

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements');

      const requirements = [
        {
          id: 'REQ-001',
          title: 'Requirement',
          description: 'Description',
          priority: 'high' as const,
          category: 'Security',
        },
      ];

      mockToolExecutor.setResult(GAP_REQUIREMENTS_TOOL.toolId, {
        functionalRequirements: requirements,
        summary: 'Generated',
        gapsAddressed: ['GAP-001'],
      });

      const result = node.execute(inputState);

      expect(result.functionalRequirements).toEqual(requirements);
      expect(result.summary).toBe('Generated');
      expect(result.gapsAddressed).toEqual(['GAP-001']);
    });
  });
});
