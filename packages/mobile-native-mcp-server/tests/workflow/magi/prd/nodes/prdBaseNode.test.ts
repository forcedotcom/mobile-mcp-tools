/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PRDBaseNode } from '../../../../../src/workflow/magi/prd/nodes/prdBaseNode.js';
import { PRDState } from '../../../../../src/workflow/magi/prd/metadata.js';

/**
 * Concrete test implementation of PRDBaseNode
 */
class TestPRDBaseNode extends PRDBaseNode {
  public lastExecutedState?: PRDState;

  execute = (state: PRDState): Partial<PRDState> => {
    this.lastExecutedState = state;
    return {};
  };
}

describe('PRDBaseNode', () => {
  let testNode: TestPRDBaseNode;

  beforeEach(() => {
    testNode = new TestPRDBaseNode('testNode');
  });

  describe('Constructor', () => {
    it('should initialize with provided name', () => {
      expect(testNode.name).toBe('testNode');
    });

    it('should set name correctly', () => {
      const customNode = new TestPRDBaseNode('customName');
      expect(customNode.name).toBe('customName');
    });
  });

  describe('execute()', () => {
    it('should have execute method defined', () => {
      expect(testNode.execute).toBeDefined();
      expect(typeof testNode.execute).toBe('function');
    });

    it('should receive state and return partial state', () => {
      const state = {
        projectPath: '/path/to/project',
        userUtterance: 'Test utterance',
      } as PRDState;

      const result = testNode.execute(state);

      expect(testNode.lastExecutedState).toBe(state);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });
});
