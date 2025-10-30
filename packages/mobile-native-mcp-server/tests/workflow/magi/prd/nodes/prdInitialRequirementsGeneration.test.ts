/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDInitialRequirementsGenerationNode } from '../../../../../src/workflow/magi/prd/nodes/prdInitialRequirementsGeneration.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { INITIAL_REQUIREMENTS_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-initial-requirements/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  readMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
  },
}));

describe('PRDInitialRequirementsGenerationNode', () => {
  let node: PRDInitialRequirementsGenerationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDInitialRequirementsGenerationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('initialRequirementsGeneration');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke initial requirements tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      mockToolExecutor.setResult(INITIAL_REQUIREMENTS_TOOL.toolId, {
        functionalRequirements: [],
        summary: 'Requirements generated',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(INITIAL_REQUIREMENTS_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(INITIAL_REQUIREMENTS_TOOL.description);
    });

    it('should pass feature brief to tool', () => {
      const featureBrief = '# Feature Brief\n\nContent';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: featureBrief,
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      mockToolExecutor.setResult(INITIAL_REQUIREMENTS_TOOL.toolId, {
        functionalRequirements: [],
        summary: 'Summary',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBrief).toBe(featureBrief);
    });

    it('should return functional requirements', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      const requirements = [
        {
          id: 'REQ-001',
          title: 'Requirement 1',
          description: 'Description 1',
          priority: 'high' as const,
          category: 'UI/UX',
        },
      ];

      mockToolExecutor.setResult(INITIAL_REQUIREMENTS_TOOL.toolId, {
        functionalRequirements: requirements,
        summary: 'Generated requirements',
      });

      const result = node.execute(inputState);

      expect(result.functionalRequirements).toEqual(requirements);
      expect(result.summary).toBe('Generated requirements');
    });
  });
});
