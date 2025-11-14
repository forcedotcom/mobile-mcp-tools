/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDRequirementsFinalizationNode } from '../../../../src/workflow/prd/nodes/prdRequirementsFinalization.js';
import { MockToolExecutor } from '../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { REQUIREMENTS_FINALIZATION_TOOL } from '../../../../src/tools/prd/magi-prd-requirements-finalization/metadata.js';
import * as magiDirectory from '../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    REQUIREMENTS: 'requirements',
  },
}));

describe('PRDRequirementsFinalizationNode', () => {
  let node: PRDRequirementsFinalizationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDRequirementsFinalizationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('requirementsFinalization');
    });
  });

  describe('execute() - Tool Invocation', () => {
    it('should invoke requirements finalization tool with correct metadata', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      const finalizedContent = '# Requirements\n\n## Status\n**Status**: approved';
      mockToolExecutor.setResult(REQUIREMENTS_FINALIZATION_TOOL.toolId, {
        finalizedRequirementsContent: finalizedContent,
        finalizationSummary: 'Requirements finalized',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(REQUIREMENTS_FINALIZATION_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(REQUIREMENTS_FINALIZATION_TOOL.description);
    });

    it('should pass requirements path to tool', () => {
      const requirementsPath = '/path/to/project/magi-sdd/feature-123/requirements.md';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(requirementsPath);
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(REQUIREMENTS_FINALIZATION_TOOL.toolId, {
        finalizedRequirementsContent: '# Requirements\n\n## Status\n**Status**: approved',
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.requirementsPath).toBe(requirementsPath);
    });

    it('should write finalized requirements markdown to file', () => {
      const finalizedContent = '# Requirements\n\n## Status\n**Status**: approved';
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/requirements.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue('/path/to/requirements.md');

      mockToolExecutor.setResult(REQUIREMENTS_FINALIZATION_TOOL.toolId, {
        finalizedRequirementsContent: finalizedContent,
      });

      const result = node.execute(inputState);

      expect(magiDirectory.writeMagiArtifact).toHaveBeenCalledWith(
        '/path/to/project',
        'feature-123',
        expect.anything(),
        finalizedContent
      );
      expect(result).toEqual({});
    });
  });
});
