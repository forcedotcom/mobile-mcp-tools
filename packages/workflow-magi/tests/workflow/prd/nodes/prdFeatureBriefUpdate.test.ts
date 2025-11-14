/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefUpdateNode } from '../../../../src/workflow/prd/nodes/prdFeatureBriefUpdate.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_UPDATE_TOOL } from '../../../../src/tools/prd/magi-prd-feature-brief-update/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief',
  },
}));

describe('PRDFeatureBriefUpdateNode', () => {
  let node: PRDFeatureBriefUpdateNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDFeatureBriefUpdateNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('featureBriefUpdate');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke feature brief update tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        isFeatureBriefApproved: false,
        featureBriefModifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: '# Updated Feature Brief\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_UPDATE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_UPDATE_TOOL.description);
    });

    it('should pass feature brief path and review result to tool', () => {
      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        isFeatureBriefApproved: false,
        featureBriefModifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(featureBriefPath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(featureBriefPath);

      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: '# Updated Brief',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBriefPath).toBe(featureBriefPath);
      expect(lastCall?.input.reviewResult.approved).toBe(false);
      expect(lastCall?.input.reviewResult.modifications).toBeDefined();
    });

    it('should write updated feature brief file and return state', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        isFeatureBriefApproved: false,
        featureBriefModifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated content',
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      const updatedContent = '# Updated Feature Brief\n\nNew content';
      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: updatedContent,
      });

      const result = node.execute(inputState);

      expect(result.featureId).toBe('feature-123'); // Same feature ID
      expect(result.isFeatureBriefApproved).toBeUndefined(); // Cleared
      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        updatedContent
      );
    });
  });

  describe('execute() - Validation Errors', () => {
    it('should throw error when feature brief file not found', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        isFeatureBriefApproved: false,
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: '# Updated Brief',
      });

      expect(() => {
        node.execute(inputState);
      }).not.toThrow('Feature brief file not found');
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
