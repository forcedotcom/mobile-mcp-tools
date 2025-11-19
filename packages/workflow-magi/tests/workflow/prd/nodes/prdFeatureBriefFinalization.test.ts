/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefFinalizationNode } from '../../../../src/workflow/prd/nodes/prdFeatureBriefFinalization.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_FINALIZATION_TOOL } from '../../../../src/tools/prd/magi-prd-feature-brief-finalization/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief',
  },
}));

describe('PRDFeatureBriefFinalizationNode', () => {
  let node: PRDFeatureBriefFinalizationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDFeatureBriefFinalizationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('featureBriefFinalization');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke feature brief finalization tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_FINALIZATION_TOOL.toolId, {
        finalizedFeatureBriefContent:
          '# Feature Brief\n\n## Status\n**Status**: approved\n\nContent',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_FINALIZATION_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_FINALIZATION_TOOL.description);
    });

    it('should pass feature brief file path to tool', () => {
      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(featureBriefPath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(featureBriefPath);

      mockToolExecutor.setResult(FEATURE_BRIEF_FINALIZATION_TOOL.toolId, {
        finalizedFeatureBriefContent:
          '# Feature Brief\n\n## Status\n**Status**: approved\n\nContent',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBriefPath).toBe(featureBriefPath);
    });

    it('should write finalized feature brief to file', () => {
      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const finalizedContent = '# Feature Brief\n\n## Status\n**Status**: approved\n\nContent';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(featureBriefPath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(featureBriefPath);

      mockToolExecutor.setResult(FEATURE_BRIEF_FINALIZATION_TOOL.toolId, {
        finalizedFeatureBriefContent: finalizedContent,
      });

      node.execute(inputState);

      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        magiDirectory.MAGI_ARTIFACTS.FEATURE_BRIEF,
        finalizedContent
      );
    });

    it('should clear review state after finalization', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        isFeatureBriefApproved: true,
        featureBriefModifications: [{ section: 'Overview', modificationReason: 'test' }],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_FINALIZATION_TOOL.toolId, {
        finalizedFeatureBriefContent:
          '# Feature Brief\n\n## Status\n**Status**: approved\n\nContent',
      });

      const result = node.execute(inputState);

      expect(result.isFeatureBriefApproved).toBeUndefined();
      expect(result.featureBriefModifications).toBeUndefined();
    });
  });
});
