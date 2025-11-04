/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFeatureBriefUpdateNode } from '../../../../../src/workflow/magi/prd/nodes/prdFeatureBriefUpdate.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { FEATURE_BRIEF_UPDATE_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-feature-brief-update/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  readMagiArtifact: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
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
        userUtterance: 'Add authentication',
        featureBriefUserFeedback: 'Need more details',
      });

      const featureBriefContent = '# Feature Brief\n\nOriginal content';
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
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

    it('should pass existing feature ID and content to tool', () => {
      const featureBriefContent = '# Original Brief';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Original request',
        featureBriefUserFeedback: 'Need updates',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: '# Updated Brief',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.existingFeatureId).toBe('feature-123');
      expect(lastCall?.input.featureBrief).toBe(featureBriefContent);
      expect(lastCall?.input.userUtterance).toBe('Original request');
      expect(lastCall?.input.userFeedback).toBe('Need updates');
    });

    it('should write updated feature brief file and return state', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Update',
      });

      const featureBriefContent = '# Original';
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(featureBriefContent);
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/feature-brief.md'
      );

      const updatedContent = '# Updated Feature Brief\n\nNew content';
      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: updatedContent,
      });

      const result = node.execute(inputState);

      expect(result.featureId).toBe('feature-123'); // Same feature ID
      expect(result.isFeatureBriefApproved).toBeUndefined(); // Cleared
      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalledWith(
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
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      expect(() => {
        node.execute(inputState);
      }).toThrow('Feature brief file not found');
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
