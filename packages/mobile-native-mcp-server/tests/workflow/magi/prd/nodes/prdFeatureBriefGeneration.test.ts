/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefGenerationNode } from '../../../../../src/workflow/magi/prd/nodes/prdFeatureBriefGeneration.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-feature-brief/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  getPrdWorkspacePath: vi.fn(),
  getExistingFeatureIds: vi.fn(),
  createFeatureDirectory: vi.fn(),
  getMagiPath: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
  },
}));

describe('PRDFeatureBriefGenerationNode', () => {
  let node: PRDFeatureBriefGenerationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDFeatureBriefGenerationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('featureBriefGeneration');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke feature brief tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add authentication',
      });

      vi.mocked(wellKnownDirectory.getPrdWorkspacePath).mockReturnValue(
        '/path/to/project/magi-sdd'
      );
      vi.mocked(wellKnownDirectory.getExistingFeatureIds).mockReturnValue(['existing-feature']);
      vi.mocked(wellKnownDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief',
        recommendedFeatureId: 'feature-123',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_TOOL.description);
    });

    it('should pass userUtterance and currentFeatureIds to tool', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add authentication feature',
      });

      vi.mocked(wellKnownDirectory.getPrdWorkspacePath).mockReturnValue(
        '/path/to/project/magi-sdd'
      );
      vi.mocked(wellKnownDirectory.getExistingFeatureIds).mockReturnValue([
        'feature-1',
        'feature-2',
      ]);
      vi.mocked(wellKnownDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief',
        recommendedFeatureId: 'feature-123',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.userUtterance).toBe('Add authentication feature');
      expect(lastCall?.input.currentFeatureIds).toEqual(['feature-1', 'feature-2']);
    });

    it('should create feature directory', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
      });

      vi.mocked(wellKnownDirectory.getPrdWorkspacePath).mockReturnValue(
        '/path/to/project/magi-sdd'
      );
      vi.mocked(wellKnownDirectory.getExistingFeatureIds).mockReturnValue([]);
      vi.mocked(wellKnownDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief',
        recommendedFeatureId: 'feature-123',
      });

      node.execute(inputState);

      expect(wellKnownDirectory.createFeatureDirectory).toHaveBeenCalled();
    });

    it('should return featureId and featureBriefContent', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
      });

      vi.mocked(wellKnownDirectory.getPrdWorkspacePath).mockReturnValue(
        '/path/to/project/magi-sdd'
      );
      vi.mocked(wellKnownDirectory.getExistingFeatureIds).mockReturnValue([]);
      vi.mocked(wellKnownDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief\n\nContent',
        recommendedFeatureId: 'feature-123',
      });

      const result = node.execute(inputState);

      expect(result.featureId).toBe('feature-123');
      expect(result.featureBriefContent).toBe('# Feature Brief\n\nContent');
    });
  });

  describe('execute() - Validation Errors', () => {
    it('should throw error when projectPath is missing', () => {
      const inputState = createPRDTestState({
        projectPath: undefined,
        userUtterance: 'Add feature',
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow('projectPath');
    });

    it('should throw error when featureId already exists', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
        featureId: 'existing-feature',
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow('Feature brief already exists');
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty currentFeatureIds', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
      });

      vi.mocked(wellKnownDirectory.getPrdWorkspacePath).mockReturnValue(
        '/path/to/project/magi-sdd'
      );
      vi.mocked(wellKnownDirectory.getExistingFeatureIds).mockReturnValue([]);
      vi.mocked(wellKnownDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(wellKnownDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief',
        recommendedFeatureId: 'feature-123',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.currentFeatureIds).toEqual([]);
    });
  });
});
