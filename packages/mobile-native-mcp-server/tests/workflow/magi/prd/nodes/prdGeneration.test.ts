/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDGenerationNode } from '../../../../../src/workflow/magi/prd/nodes/prdGeneration.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { PRD_GENERATION_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-generation/metadata.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    FEATURE_BRIEF: 'feature-brief.md',
    REQUIREMENTS: 'requirements.md',
    PRD: 'prd.md',
  },
}));

describe('PRDGenerationNode', () => {
  let node: PRDGenerationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDGenerationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('prdGeneration');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke PRD generation tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add authentication',
      });

      vi.mocked(wellKnownDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue('/path/to/prd.md');

      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent: '# PRD\n\nContent',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(PRD_GENERATION_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(PRD_GENERATION_TOOL.description);
    });

    it('should pass user utterance, feature brief, and requirements to tool', () => {
      const featureBriefPath = '/path/to/project/magi-sdd/feature-123/feature-brief.md';
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add authentication feature',
      });

      vi.mocked(wellKnownDirectory.getMagiPath)
        .mockReturnValueOnce(featureBriefPath) // feature brief path
        .mockReturnValueOnce(requirementsPath); // requirements path
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue('/path/to/prd.md');

      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent: '# PRD',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.featureBriefPath).toBe(featureBriefPath);
      expect(lastCall?.input.requirementsPath).toBe(requirementsPath);
    });

    it('should write PRD content to file', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add feature',
      });

      vi.mocked(wellKnownDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      const prdContent = '# PRD\n\nComplete PRD content';
      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent,
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        prdContent
      );
    });

    it('should return PRD content', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add feature',
      });

      vi.mocked(wellKnownDirectory.getMagiPath)
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/feature-brief.md') // feature brief path
        .mockReturnValueOnce('/path/to/project/magi-sdd/feature-123/requirements.md'); // requirements path
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      const prdContent = '# PRD\n\nContent';

      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent,
      });

      const result = node.execute(inputState);

      expect(result.prdContent).toBe(prdContent);
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
      }).toThrow();
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
