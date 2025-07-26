/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { readdir } from 'node:fs/promises';
import { Score } from '../../src/agent/lwcEvaluatorAgent.js';
import { Evaluator } from '../../src/evaluator/evaluator.js';

// Mock the fs/promises module
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
}));

// Mock the Evaluator class
vi.mock('../../src/evaluator/evaluator.js', () => ({
  Evaluator: {
    create: vi.fn(),
  },
}));

// Mock the LwcGenerationEvaluator class
vi.mock('../../src/evaluator/lwcGenerationEvaluator.js', () => ({
  LwcGenerationEvaluator: {
    create: vi.fn(),
  },
}));

// Mock console methods to capture output
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
};

// Mock process.exit to prevent actual exit
vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('run-evaluation script tests', () => {
  let mockEvaluator: Evaluator;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock environment variables
    Object.assign(process.env, {
      JUDGE_MODEL: 'test-model',
      JUDGE_MODEL_PROVIDER: 'test-provider',
      JUDGE_MODEL_API_KEY: 'test-api-key',
      JUDGE_MODEL_BASE_URL: 'https://test-api.com',
      JUDGE_MODEL_CLIENT_FEATURE_ID: 'test-feature',
      JUDGE_MODEL_TENANT_ID: 'test-tenant',
      MODEL_TO_EVAL: 'test-model',
      MODEL_TO_EVAL_PROVIDER: 'test-provider',
      MODEL_TO_EVAL_API_KEY: 'test-api-key',
      MODEL_TO_EVAL_BASE_URL: 'https://test-api.com',
      MODEL_TO_EVAL_CLIENT_FEATURE_ID: 'test-feature',
      MODEL_TO_EVAL_TENANT_ID: 'test-tenant',
    });

    // Setup mock evaluator with proper mock methods
    mockEvaluator = {
      evaluate: vi.fn(),
      destroy: vi.fn(),
    } as unknown as Evaluator;

    // Mock Evaluator.create to return our mock evaluator
    const { Evaluator: MockedEvaluator } = await import('../../src/evaluator/evaluator.js');
    (MockedEvaluator.create as Mock).mockResolvedValue(mockEvaluator);

    // Mock console methods
    global.console = mockConsole as unknown as Console;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAvailableComponents', () => {
    it('should return list of available components', async () => {
      const mockEntries = [
        { name: 'component1', isDirectory: () => true },
        { name: 'component2', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ];
      (readdir as unknown as Mock).mockResolvedValue(mockEntries);

      // Import the function directly
      const { getAvailableComponents } = await import('../../src/scripts/run-evaluation.ts');
      const result = await getAvailableComponents();

      expect(result).toEqual(['mobile-web/component1', 'mobile-web/component2']);
    });

    it('should handle directory read errors', async () => {
      (readdir as unknown as Mock).mockRejectedValue(new Error('Directory not found'));

      const { getAvailableComponents } = await import('../../src/scripts/run-evaluation.ts');
      const result = await getAvailableComponents();

      expect(result).toEqual([]);
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error reading dataset directory:',
        expect.any(Error)
      );
    });
  });

  describe('evaluateComponent', () => {
    it('should successfully evaluate a component', async () => {
      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      const { evaluateComponent } = await import('../../src/scripts/run-evaluation.ts');
      const result = await evaluateComponent(mockEvaluator, 'test-component');

      expect(result).toEqual({
        componentName: 'test-component',
        score: mockScore,
      });
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('test-component');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Evaluating component: test-component')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ test-component - Verdict: Pass GA Criteria, Score: 85/100')
      );
    });

    it('should handle evaluation errors', async () => {
      const error = new Error('Evaluation failed');
      mockEvaluator.evaluate = vi.fn().mockRejectedValue(error);

      const { evaluateComponent } = await import('../../src/scripts/run-evaluation.ts');
      const result = await evaluateComponent(mockEvaluator, 'test-component');

      expect(result).toEqual({
        componentName: 'test-component',
        error: 'Evaluation failed',
      });
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error evaluating test-component:'),
        error
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockEvaluator.evaluate = vi.fn().mockRejectedValue('String error');

      const { evaluateComponent } = await import('../../src/scripts/run-evaluation.ts');
      const result = await evaluateComponent(mockEvaluator, 'test-component');

      expect(result).toEqual({
        componentName: 'test-component',
        error: 'String error',
      });
    });
  });

  describe('printSummary', () => {
    it('should print evaluation summary correctly', async () => {
      const mockResults = [
        { componentName: 'comp1', score: { rawScore: 80, verdict: 'Pass GA Criteria' as const } },
        { componentName: 'comp2', score: { rawScore: 90, verdict: 'Pass GA Criteria' as const } },
        { componentName: 'comp3', error: 'Failed' },
      ];

      const summary = {
        totalComponents: 3,
        successfulEvaluations: 2,
        failedEvaluations: 1,
        averageScore: 85,
        results: mockResults,
      };

      const { printSummary } = await import('../../src/scripts/run-evaluation.ts');
      printSummary(summary);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('📊 EVALUATION SUMMARY')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Total Components: 3'));
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Successful Evaluations: 2')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed Evaluations: 1')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Average Score: 85.00/10')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('📋 Detailed Results:'));
    });

    it('should handle empty results', async () => {
      const summary = {
        totalComponents: 0,
        successfulEvaluations: 0,
        failedEvaluations: 0,
        averageScore: 0,
        results: [],
      };

      const { printSummary } = await import('../../src/scripts/run-evaluation.ts');
      printSummary(summary);

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Total Components: 0'));
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Average Score: 0.00/10')
      );
    });
  });

  describe('runEvaluation', () => {
    it('should run evaluation for all available components', async () => {
      const mockEntries = [
        { name: 'comp1', isDirectory: () => true },
        { name: 'comp2', isDirectory: () => true },
      ];
      (readdir as unknown as Mock).mockResolvedValue(mockEntries);

      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      const { runEvaluation } = await import('../../src/scripts/run-evaluation.ts');
      await runEvaluation();

      const { Evaluator: MockedEvaluator } = await import('../../src/evaluator/evaluator.js');
      expect(MockedEvaluator.create).toHaveBeenCalled();
      expect(mockEvaluator.evaluate).toHaveBeenCalledTimes(2);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('mobile-web/comp1');
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('mobile-web/comp2');
      expect(mockEvaluator.destroy).toHaveBeenCalled();
    });

    it('should run evaluation for specific components', async () => {
      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      const { runEvaluation } = await import('../../src/scripts/run-evaluation.ts');
      await runEvaluation(['comp1', 'comp2']);

      expect(mockEvaluator.evaluate).toHaveBeenCalledTimes(2);
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('comp1');
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('comp2');
    });

    it('should handle no components found', async () => {
      (readdir as unknown as Mock).mockResolvedValue([]);

      const { runEvaluation } = await import('../../src/scripts/run-evaluation.ts');
      await runEvaluation();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  No components found to evaluate')
      );
      expect(mockEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure results', async () => {
      const mockEntries = [
        { name: 'comp1', isDirectory: () => true },
        { name: 'comp2', isDirectory: () => true },
      ];
      (readdir as unknown as Mock).mockResolvedValue(mockEntries);

      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi
        .fn()
        .mockResolvedValueOnce(mockScore)
        .mockRejectedValueOnce(new Error('Evaluation failed'));

      const { runEvaluation } = await import('../../src/scripts/run-evaluation.ts');
      await runEvaluation();

      expect(mockEvaluator.evaluate).toHaveBeenCalledTimes(2);
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Successful Evaluations: 1')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed Evaluations: 1')
      );
    });

    it('should handle evaluator creation failure', async () => {
      const { Evaluator: MockedEvaluator } = await import('../../src/evaluator/evaluator.js');
      (MockedEvaluator.create as Mock).mockRejectedValue(new Error('Failed to create evaluator'));

      const { runEvaluation } = await import('../../src/scripts/run-evaluation.ts');
      await expect(runEvaluation()).rejects.toThrow('Failed to create evaluator');
    });

    it('should handle evaluator destruction in finally block', async () => {
      const mockEntries = [{ name: 'comp1', isDirectory: () => true }];
      (readdir as unknown as Mock).mockResolvedValue(mockEntries);

      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      const { runEvaluation } = await import('../../src/scripts/run-evaluation.ts');
      await runEvaluation();

      expect(mockEvaluator.destroy).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('🧹 Cleaning up...'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('✅ Cleanup completed'));
    });
  });

  describe('printUsage', () => {
    it('should print usage information', async () => {
      const { printUsage } = await import('../../src/scripts/run-evaluation.ts');
      printUsage();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage: tsx run-evaluation.ts')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('--help, -h'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('JUDGE_MODEL'));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('MODEL_TO_EVAL'));
    });
  });

  describe('main function', () => {
    it('should handle help flag', async () => {
      process.argv = ['node', 'run-evaluation.ts', '--help'];

      const { main } = await import('../../src/scripts/run-evaluation.ts');
      await main();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage: tsx run-evaluation.ts')
      );
    });

    it('should handle short help flag', async () => {
      process.argv = ['node', 'run-evaluation.ts', '-h'];

      const { main } = await import('../../src/scripts/run-evaluation.ts');
      await main();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage: tsx run-evaluation.ts')
      );
    });

    it('should run evaluation with component names', async () => {
      process.argv = ['node', 'run-evaluation.ts', 'comp1', 'comp2'];

      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      const { main } = await import('../../src/scripts/run-evaluation.ts');
      await main();

      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('comp1');
      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('comp2');
    });

    it('should run evaluation without component names', async () => {
      process.argv = ['node', 'run-evaluation.ts'];

      const mockEntries = [{ name: 'comp1', isDirectory: () => true }];
      (readdir as unknown as Mock).mockResolvedValue(mockEntries);

      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      const { main } = await import('../../src/scripts/run-evaluation.ts');
      await main();

      expect(mockEvaluator.evaluate).toHaveBeenCalledWith('mobile-web/comp1');
    });

    it('should handle unhandled errors', async () => {
      process.argv = ['node', 'run-evaluation.ts'];
      const { Evaluator: MockedEvaluator } = await import('../../src/evaluator/evaluator.js');
      (MockedEvaluator.create as Mock).mockRejectedValue(new Error('Unhandled error'));

      const { main } = await import('../../src/scripts/run-evaluation.ts');
      await expect(main()).rejects.toThrow('Unhandled error');
    });
  });

  describe('script execution', () => {
    it.skip('should execute main function when run directly', async () => {
      // Mock import.meta.url to simulate direct execution
      const originalImportMeta = global.importMeta;
      global.importMeta = { url: `file://${process.argv[1]}` } as unknown as ImportMeta;

      const mockScore: Score = { rawScore: 85, verdict: 'Pass GA Criteria' as const };
      mockEvaluator.evaluate = vi.fn().mockResolvedValue(mockScore);

      // This would normally trigger the script execution
      // We'll test the main function directly instead
      const { main } = await import('../../src/scripts/run-evaluation.ts');
      await main();

      expect(mockEvaluator.evaluate).toHaveBeenCalled();

      // Restore original importMeta
      global.importMeta = originalImportMeta;
    });
  });
});
