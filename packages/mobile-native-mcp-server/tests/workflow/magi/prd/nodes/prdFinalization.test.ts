/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRDFinalizationNode } from '../../../../../src/workflow/magi/prd/nodes/prdFinalization.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';

describe('PRDFinalizationNode', () => {
  let node: PRDFinalizationNode;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    node = new PRDFinalizationNode(mockLogger);
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
      expect(nodeWithoutLogger['logger']).toBeUndefined();
    });
  });

  describe('execute()', () => {
    it('should return empty partial state', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
        featureId: 'test-feature',
      });

      const result = node.execute(inputState);

      expect(result).toEqual({});
    });

    it('should log completion message', () => {
      const inputState = createPRDTestState({
        projectPath: '/path/to/project',
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
        prdContent: '# PRD Content',
        isPrdApproved: true,
      });

      const result = node.execute(inputState);

      expect(result).toEqual({});
    });
  });
});
