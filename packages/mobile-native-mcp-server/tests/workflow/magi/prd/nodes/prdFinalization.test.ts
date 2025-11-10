/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDFinalizationNode } from '../../../../../src/workflow/magi/prd/nodes/prdFinalization.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import { PRD_FINALIZATION_TOOL } from '../../../../../src/tools/magi/prd/magi-prd-finalization/metadata.js';
import * as magiDirectory from '../../../../../src/utils/magiDirectory.js';

// Mock magiDirectory utilities
vi.mock('../../../../../src/utils/magiDirectory.js', () => ({
  getMagiPath: vi.fn(),
  writeMagiArtifact: vi.fn(),
  MAGI_ARTIFACTS: {
    PRD: 'prd',
  },
}));

describe('PRDFinalizationNode', () => {
  let node: PRDFinalizationNode;
  let mockLogger: MockLogger;
  let mockToolExecutor: MockToolExecutor;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockToolExecutor = new MockToolExecutor();
    node = new PRDFinalizationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('prdFinalization');
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new PRDFinalizationNode();
      expect(nodeWithoutLogger['logger']).toBeDefined();
    });
  });

  describe('execute()', () => {
    it('should return empty partial state', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'test-feature',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/test-feature/prd.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/test-feature/prd.md'
      );

      mockToolExecutor.setResult(PRD_FINALIZATION_TOOL.toolId, {
        finalizedPrdContent: '# PRD\n\nFinalized content',
      });

      const result = node.execute(inputState);

      expect(result).toEqual({});
    });

    it('should log completion message', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'test-feature',
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/test-feature/prd.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/test-feature/prd.md'
      );

      mockToolExecutor.setResult(PRD_FINALIZATION_TOOL.toolId, {
        finalizedPrdContent: '# PRD\n\nFinalized content',
      });

      mockLogger.reset();

      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      expect(infoLogs.some(log => log.message.includes('PRD workflow completed'))).toBe(true);
    });

    it('should handle any state without modifying it', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'test-feature',
        isPrdApproved: true,
      });

      vi.mocked(magiDirectory.getMagiPath).mockReturnValue(
        '/path/to/project/magi-sdd/test-feature/prd.md'
      );
      vi.mocked(magiDirectory.writeMagiArtifact).mockReturnValue(
        '/path/to/project/magi-sdd/test-feature/prd.md'
      );

      mockToolExecutor.setResult(PRD_FINALIZATION_TOOL.toolId, {
        finalizedPrdContent: '# PRD\n\nFinalized content',
      });

      const result = node.execute(inputState);

      expect(result).toEqual({});
    });
  });
});
