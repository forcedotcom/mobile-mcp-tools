/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRDMagiInitializationNode } from '../../../../../src/workflow/magi/prd/nodes/prdMagiInitialization.js';
import { MockToolExecutor } from '../../../../utils/MockToolExecutor.js';
import { MockLogger } from '../../../../utils/MockLogger.js';
import { createPRDTestState } from '../../../utils/prdStateBuilders.js';
import * as wellKnownDirectory from '../../../../../src/utils/wellKnownDirectory.js';

// Mock wellKnownDirectory utilities
vi.mock('../../../../../src/utils/wellKnownDirectory.js', () => ({
  ensureMagiSddDirectory: vi.fn(),
}));

describe('PRDMagiInitializationNode', () => {
  let node: PRDMagiInitializationNode;
  let mockToolExecutor: MockToolExecutor;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockToolExecutor = new MockToolExecutor();
    mockLogger = new MockLogger();
    node = new PRDMagiInitializationNode(mockToolExecutor, mockLogger);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('magiInitialization');
    });

    it('should use provided tool executor', () => {
      expect(node['toolExecutor']).toBe(mockToolExecutor);
    });

    it('should use provided logger', () => {
      expect(node['logger']).toBe(mockLogger);
    });
  });

  describe('execute() - Successful Initialization', () => {
    it('should extract projectPath and userUtterance from userInput', () => {
      const projectPath = '/path/to/project';
      const userUtterance = 'Add authentication feature';
      const inputState = createPRDTestState({
        userInput: {
          projectPath,
          userUtterance,
        },
      });

      vi.mocked(wellKnownDirectory.ensureMagiSddDirectory).mockReturnValue(
        '/path/to/project/magi-sdd'
      );

      const result = node.execute(inputState);

      expect(result.projectPath).toBe(projectPath);
      expect(result.userUtterance).toBe(userUtterance);
    });

    it('should call ensureMagiSddDirectory', () => {
      const projectPath = '/path/to/project';
      const inputState = createPRDTestState({
        userInput: {
          projectPath,
          userUtterance: 'Test utterance',
        },
      });

      vi.mocked(wellKnownDirectory.ensureMagiSddDirectory).mockReturnValue(
        '/path/to/project/magi-sdd'
      );

      node.execute(inputState);

      expect(wellKnownDirectory.ensureMagiSddDirectory).toHaveBeenCalledWith(projectPath);
    });

    it('should log directory creation', () => {
      const projectPath = '/path/to/project';
      const inputState = createPRDTestState({
        userInput: {
          projectPath,
          userUtterance: 'Test utterance',
        },
      });

      vi.mocked(wellKnownDirectory.ensureMagiSddDirectory).mockReturnValue(
        '/path/to/project/magi-sdd'
      );
      mockLogger.reset();

      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      expect(infoLogs.some(log => log.message.includes('magi-sdd directory'))).toBe(true);
    });
  });

  describe('execute() - Validation Errors', () => {
    it('should throw error when projectPath is missing', () => {
      const inputState = createPRDTestState({
        userInput: {
          userUtterance: 'Test utterance',
        },
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow('projectPath');
    });

    it('should throw error when userUtterance is missing', () => {
      const inputState = createPRDTestState({
        userInput: {
          projectPath: '/path/to/project',
        },
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow('userUtterance');
    });

    it('should throw error when both are missing', () => {
      const inputState = createPRDTestState({
        userInput: {},
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow('projectPath');
    });
  });

  describe('execute() - Directory Creation Errors', () => {
    it('should return error messages when directory creation fails', () => {
      const projectPath = '/path/to/project';
      const inputState = createPRDTestState({
        userInput: {
          projectPath,
          userUtterance: 'Test utterance',
        },
      });

      const errorMessage = 'Permission denied';
      vi.mocked(wellKnownDirectory.ensureMagiSddDirectory).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = node.execute(inputState);

      expect(result.prdWorkflowFatalErrorMessages).toBeDefined();
      expect(result.prdWorkflowFatalErrorMessages?.[0]).toContain(errorMessage);
    });

    it('should log error when directory creation fails', () => {
      const projectPath = '/path/to/project';
      const inputState = createPRDTestState({
        userInput: {
          projectPath,
          userUtterance: 'Test utterance',
        },
      });

      vi.mocked(wellKnownDirectory.ensureMagiSddDirectory).mockImplementation(() => {
        throw new Error('Directory creation failed');
      });
      mockLogger.reset();

      node.execute(inputState);

      const errorLogs = mockLogger.getLogsByLevel('error');
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].message).toContain('Failed to initialize');
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle empty userInput', () => {
      const inputState = createPRDTestState({
        userInput: undefined,
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow();
    });

    it('should handle userInput with null values', () => {
      const inputState = createPRDTestState({
        userInput: {
          projectPath: null as unknown as string,
          userUtterance: null as unknown as string,
        },
      });

      expect(() => {
        node.execute(inputState);
      }).toThrow();
    });
  });
});
