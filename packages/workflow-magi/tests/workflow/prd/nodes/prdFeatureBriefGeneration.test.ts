/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefGenerationNode } from '../../../../src/workflow/prd/nodes/prdFeatureBriefGeneration.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_TOOL } from '../../../../src/tools/prd/magi-prd-feature-brief/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getPrdWorkspacePath: vi.fn(),
  getExistingFeatureIds: vi.fn(),
  createFeatureDirectory: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief',
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

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockReturnValue('/path/to/project/magi-sdd');
      vi.mocked(magiDirectory.getExistingFeatureIds).mockReturnValue(['existing-feature']);
      vi.mocked(magiDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
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

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockReturnValue('/path/to/project/magi-sdd');
      vi.mocked(magiDirectory.getExistingFeatureIds).mockReturnValue(['feature-1', 'feature-2']);
      vi.mocked(magiDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
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

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockReturnValue('/path/to/project/magi-sdd');
      vi.mocked(magiDirectory.getExistingFeatureIds).mockReturnValue([]);
      vi.mocked(magiDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief',
        recommendedFeatureId: 'feature-123',
      });

      node.execute(inputState);

      expect(magiDirectory.createFeatureDirectory).toHaveBeenCalled();
    });

    it('should write feature brief file and return featureId', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
      });

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockReturnValue('/path/to/project/magi-sdd');
      vi.mocked(magiDirectory.getExistingFeatureIds).mockReturnValue([]);
      vi.mocked(magiDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      const featureBriefMarkdown = '# Feature Brief\n\nContent';
      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown,
        recommendedFeatureId: 'feature-123',
      });

      const result = node.execute(inputState);

      expect(result.featureId).toBe('feature-123');
      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        featureBriefMarkdown
      );
    });
  });

  describe('execute() - Validation Errors', () => {
    it('should throw error when projectPath is missing', () => {
      const inputState = createPRDTestState({
        projectPath: undefined,
        userUtterance: 'Add feature',
      });

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockImplementation(() => {
        throw new Error('projectPath is required');
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow();
    });

    it('should not validate featureId existence (tool handles uniqueness)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
        featureId: 'existing-feature',
      });

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockReturnValue('/path/to/project/magi-sdd');
      vi.mocked(magiDirectory.getExistingFeatureIds).mockReturnValue(['existing-feature']);
      vi.mocked(magiDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_TOOL.toolId, {
        featureBriefMarkdown: '# Feature Brief',
        recommendedFeatureId: 'feature-123',
      });

      // Should not throw - tool will handle uniqueness
      expect(() => node.execute(inputState)).not.toThrow();
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty currentFeatureIds', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        userUtterance: 'Add feature',
      });

      vi.mocked(magiDirectory.getPrdWorkspacePath).mockReturnValue('/path/to/project/magi-sdd');
      vi.mocked(magiDirectory.getExistingFeatureIds).mockReturnValue([]);
      vi.mocked(magiDirectory.createFeatureDirectory).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
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
