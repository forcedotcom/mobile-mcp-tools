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
  getMagiPath: vi.fn(),
  readMagiArtifact: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
    REQUIREMENTS: 'requirements.md',
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

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      const requirementsMarkdown = '# Requirements\n\n## Status\n**Status**: draft';
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(INITIAL_REQUIREMENTS_TOOL.toolId, {
        requirementsMarkdown,
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

      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(INITIAL_REQUIREMENTS_TOOL.toolId, {
        requirementsMarkdown: '# Requirements',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBriefPath).toBe('/path/to/project/magi-sdd/feature-123/feature-brief.md');
    });

    it('should write requirements markdown to file', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Feature Brief',
      });

      const requirementsMarkdown = '# Requirements\n\n## Status\n**Status**: draft';
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Feature Brief');
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(INITIAL_REQUIREMENTS_TOOL.toolId, {
        requirementsMarkdown,
      });

      const result = node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        requirementsMarkdown
      );
      expect(result).toEqual({});
    });
  });
});
