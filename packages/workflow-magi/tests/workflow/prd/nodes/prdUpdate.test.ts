/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDUpdateNode } from '../../../../src/workflow/prd/nodes/prdUpdate.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { PRD_UPDATE_TOOL } from '../../../../src/tools/prd/magi-prd-update/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    PRD: 'prd',
  },
}));

describe('PRDUpdateNode', () => {
  let node: PRDUpdateNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDUpdateNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('prdUpdate');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke PRD update tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdModifications: [
          {
            section: 'Functional Requirements',
            modificationReason: 'User requested changes',
            requestedContent: 'Updated content',
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_UPDATE_TOOL.toolId, {
        updatedPrdContent: '# PRD\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(PRD_UPDATE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(PRD_UPDATE_TOOL.description);
    });

    it('should pass PRD file path and review result to tool', () => {
      const prdFilePath = '/path/to/project/magi-sdd/feature-123/prd.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdModifications: [
          {
            section: 'Overview',
            modificationReason: 'Needs more detail',
            requestedContent: 'Updated overview',
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(prdFilePath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(prdFilePath);

      mockToolExecutor.setResult(PRD_UPDATE_TOOL.toolId, {
        updatedPrdContent: '# PRD\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.prdFilePath).toBe(prdFilePath);
      expect(lastCall?.input.reviewResult.approved).toBe(false);
      expect(lastCall?.input.reviewResult.modifications).toEqual([
        {
          section: 'Overview',
          modificationReason: 'Needs more detail',
          requestedContent: 'Updated overview',
        },
      ]);
    });

    it('should handle empty modifications array', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdModifications: [],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_UPDATE_TOOL.toolId, {
        updatedPrdContent: '# PRD\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.reviewResult.modifications).toEqual([]);
    });

    it('should write updated PRD to file', () => {
      const prdFilePath = '/path/to/project/magi-sdd/feature-123/prd.md';
      const updatedContent = '# PRD\n\nUpdated content';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdModifications: [],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(prdFilePath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(prdFilePath);

      mockToolExecutor.setResult(PRD_UPDATE_TOOL.toolId, {
        updatedPrdContent: updatedContent,
      });

      node.execute(inputState);

      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        magiDirectory.MAGI_ARTIFACTS.PRD,
        updatedContent
      );
    });

    it('should clear review state after update', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        prdModifications: [
          {
            section: 'Overview',
            modificationReason: 'Test',
            requestedContent: 'Content',
          },
        ],
        isPrdApproved: false,
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      mockToolExecutor.setResult(PRD_UPDATE_TOOL.toolId, {
        updatedPrdContent: '# PRD\n\nUpdated content',
      });

      const result = node.execute(inputState);

      expect(result.prdModifications).toBeUndefined();
      expect(result.isPrdApproved).toBeUndefined();
    });
  });
});
