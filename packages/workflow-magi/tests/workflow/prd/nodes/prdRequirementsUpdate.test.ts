/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDRequirementsUpdateNode } from '../../../../src/workflow/prd/nodes/prdRequirementsUpdate.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { REQUIREMENTS_UPDATE_TOOL } from '../../../../src/tools/prd/magi-prd-requirements-update/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    REQUIREMENTS: 'requirements',
  },
}));

describe('PRDRequirementsUpdateNode', () => {
  let node: PRDRequirementsUpdateNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDRequirementsUpdateNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('requirementsUpdate');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke requirements update tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: ['REQ-002'],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );

      mockToolExecutor.setResult(REQUIREMENTS_UPDATE_TOOL.toolId, {
        updatedRequirementsContent: '# Requirements\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(REQUIREMENTS_UPDATE_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(REQUIREMENTS_UPDATE_TOOL.description);
    });

    it('should pass requirements path and review result to tool', () => {
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: ['REQ-002'],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(requirementsPath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(requirementsPath);

      mockToolExecutor.setResult(REQUIREMENTS_UPDATE_TOOL.toolId, {
        updatedRequirementsContent: '# Requirements\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.requirementsPath).toBe(requirementsPath);
      expect(lastCall?.input.reviewResult.approvedRequirementIds).toEqual(['REQ-001']);
      expect(lastCall?.input.reviewResult.rejectedRequirementIds).toEqual(['REQ-002']);
    });

    it('should include modifications in review result when present', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: [],
        requirementModifications: [
          {
            requirementId: 'REQ-002',
            modificationReason: 'User requested changes',
            requestedChanges: {
              title: 'Updated title',
            },
          },
        ],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );

      mockToolExecutor.setResult(REQUIREMENTS_UPDATE_TOOL.toolId, {
        updatedRequirementsContent: '# Requirements\n\nUpdated content',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.reviewResult.modifications).toBeDefined();
      expect(lastCall?.input.reviewResult.modifications).toHaveLength(1);
      expect(lastCall?.input.reviewResult.modifications?.[0]).toMatchObject({
        requirementId: 'REQ-002',
        modificationReason: 'User requested changes',
        requestedChanges: {
          title: 'Updated title',
        },
      });
    });

    it('should write updated requirements to file', () => {
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const updatedContent = '# Requirements\n\nUpdated content';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: [],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(requirementsPath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(requirementsPath);

      mockToolExecutor.setResult(REQUIREMENTS_UPDATE_TOOL.toolId, {
        updatedRequirementsContent: updatedContent,
      });

      node.execute(inputState);

      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        magiDirectory.MAGI_ARTIFACTS.REQUIREMENTS,
        updatedContent
      );
    });

    it('should clear review state after update', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        approvedRequirementIds: ['REQ-001'],
        rejectedRequirementIds: ['REQ-002'],
        requirementModifications: [],
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );

      mockToolExecutor.setResult(REQUIREMENTS_UPDATE_TOOL.toolId, {
        updatedRequirementsContent: '# Requirements\n\nUpdated content',
      });

      const result = node.execute(inputState);

      expect(result.approvedRequirementIds).toBeUndefined();
      expect(result.rejectedRequirementIds).toBeUndefined();
      expect(result.requirementModifications).toBeUndefined();
    });
  });
});

