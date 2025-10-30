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
import * as fs from 'fs';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  resolveFeatureDirectoryFromIds: vi.fn(),
  readMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
  },
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
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
        featureBriefContent: '# Feature Brief\n\nOriginal content',
        userUtterance: 'Add authentication',
        featureBriefUserFeedback: 'Need more details',
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectoryFromIds).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(true);
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: '# Updated Feature Brief\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(FEATURE_BRIEF_UPDATE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(FEATURE_BRIEF_UPDATE_TOOL.description);
    });

    it('should pass existing feature ID and content to tool', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Original Brief',
        userUtterance: 'Original request',
        featureBriefUserFeedback: 'Need updates',
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectoryFromIds).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(true);
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: '# Updated Brief',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.existingFeatureId).toBe('feature-123');
      expect(lastCall?.input.featureBrief).toBe('# Original Brief');
      expect(lastCall?.input.userUtterance).toBe('Original request');
      expect(lastCall?.input.userFeedback).toBe('Need updates');
    });

    it('should return updated feature brief content', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Original',
        userUtterance: 'Update',
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectoryFromIds).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(true);
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('');

      const updatedContent = '# Updated Feature Brief\n\nNew content';
      mockToolExecutor.setResult(FEATURE_BRIEF_UPDATE_TOOL.toolId, {
        featureBriefMarkdown: updatedContent,
      });

      const result = node.execute(inputState);

      expect(result.featureId).toBe('feature-123'); // Same feature ID
      expect(result.featureBriefContent).toBe(updatedContent);
      expect(result.isFeatureBriefApproved).toBeUndefined(); // Cleared
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
      }).toThrow('projectPath');
    });

    it('should throw error when featureId is missing', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: undefined,
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow('featureId');
    });

    it('should throw error when feature directory does not exist', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        featureBriefContent: '# Brief',
      });

      vi.mocked(wellKnownDirectory.resolveFeatureDirectoryFromIds).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123'
      );
      vi.mocked(fs.default.existsSync).mockReturnValue(false);

      expect(() => {
        node.execute(inputState);
      }).toThrow('Feature directory not found');
    });
  });
});
