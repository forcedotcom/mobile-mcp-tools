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
  readMagiArtifact: vi.fn(),
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
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements');

      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent: '# PRD\n\nContent',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI Assistant',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        requirementsCount: 5,
        traceabilityTableRows: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.llmMetadata.name).toBe(PRD_GENERATION_TOOL.toolId);
      expect(lastCall?.llmMetadata.description).toBe(PRD_GENERATION_TOOL.description);
    });

    it('should pass user utterance, feature brief, and requirements to tool', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add authentication feature',
        featureBriefContent: '# Feature Brief',
      });

      const requirementsContent = '# Requirements\n\nREQ-001: Requirement';
      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue(requirementsContent);

      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent: '# PRD',
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        requirementsCount: 0,
        traceabilityTableRows: [],
      });

      node.execute(inputState);

      const lastCall = mockToolExecutor.getLastCall();
      expect(lastCall?.input.originalUserUtterance).toBe('Add authentication feature');
      expect(lastCall?.input.featureBrief).toBe('# Feature Brief');
      expect(lastCall?.input.requirementsContent).toBe(requirementsContent);
    });

    it('should write PRD content to file', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add feature',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements');
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      const prdContent = '# PRD\n\nComplete PRD content';
      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent,
        prdFilePath: '/path/to/prd.md',
        documentStatus: {
          author: 'AI',
          lastModified: '2025-01-01',
          status: 'draft' as const,
        },
        requirementsCount: 0,
        traceabilityTableRows: [],
      });

      node.execute(inputState);

      expect(wellKnownDirectory.writeMagiArtifact).toHaveBeenCalled();
    });

    it('should return PRD content and status', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userUtterance: 'Add feature',
        featureBriefContent: '# Feature Brief',
      });

      vi.mocked(wellKnownDirectory.readMagiArtifact).mockReturnValue('# Requirements');
      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      const prdContent = '# PRD\n\nContent';
      const documentStatus = {
        author: 'AI Assistant',
        lastModified: '2025-01-01',
        status: 'draft' as const,
      };

      mockToolExecutor.setResult(PRD_GENERATION_TOOL.toolId, {
        prdContent,
        prdFilePath: '/path/to/prd.md',
        documentStatus,
        requirementsCount: 5,
        traceabilityTableRows: [],
      });

      const result = node.execute(inputState);

      expect(result.prdContent).toBe(prdContent);
      expect(result.prdStatus).toEqual(documentStatus);
    });
  });

  describe('execute() - Resume Scenario', () => {
    it('should use userInput result when provided (resume scenario)', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'feature-123',
        userInput: {
          prdContent: '# PRD from resume',
          prdFilePath: '/path/to/prd.md',
          documentStatus: {
            author: 'AI',
            lastModified: '2025-01-01',
            status: 'draft' as const,
          },
        },
      });

      vi.mocked(wellKnownDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/feature-123/prd.md'
      );

      const result = node.execute(inputState);

      expect(result.prdContent).toBe('# PRD from resume');
      expect(mockToolExecutor.getCallHistory().length).toBe(0); // Tool not called
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
