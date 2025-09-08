/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { Evaluator } from '../../src/evaluator/evaluator.js';
import { LwcGenerationEvaluator } from '../../src/evaluator/lwcGenerationEvaluator.js';
import { LwcReviewRefactorEvaluator } from '../../src/evaluator/lwcReviewRefactorEvaluator.js';
import { MobileWebMcpClient } from '../../src/mcpclient/mobileWebMcpClient.js';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { Score, CorrectnessScore } from '../../src/schema/schema.js';
import { loadEvaluationUnit, EvaluationUnit } from '../../src/utils/lwcUtils.js';
import { EVAL_DATA_FOLDER } from '../../src/evaluator/lwcGenerationEvaluator.js';

// Mock the dependencies
vi.mock('../../src/evaluator/lwcGenerationEvaluator.js');
vi.mock('../../src/evaluator/lwcReviewRefactorEvaluator.js');
vi.mock('../../src/mcpclient/mobileWebMcpClient.js');
vi.mock('../../src/utils/lwcUtils.js');

describe('Evaluator', () => {
  let mockLlmClient: LlmClient;
  let mockMcpClient: MobileWebMcpClient;
  let mockGenerationEvaluator: LwcGenerationEvaluator;
  let mockReviewRefactorEvaluator: LwcReviewRefactorEvaluator;
  let evaluator: Evaluator;

  beforeEach(() => {
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

    // Create mock instances
    mockLlmClient = { callLLM: vi.fn() } as unknown as LlmClient;
    mockMcpClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      callTool: vi.fn().mockResolvedValue({ content: [{ text: 'mock grounding' }] }),
    } as unknown as MobileWebMcpClient;
    mockGenerationEvaluator = {
      evaluate: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as LwcGenerationEvaluator;
    mockReviewRefactorEvaluator = {
      evaluate: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as LwcReviewRefactorEvaluator;
    // Mock the static create methods
    (vi.mocked(LwcGenerationEvaluator.create) as unknown as vi.Mock).mockResolvedValue(
      mockGenerationEvaluator
    );
    (vi.mocked(LwcReviewRefactorEvaluator) as unknown as vi.Mock).mockImplementation(
      () => mockReviewRefactorEvaluator
    );
    (vi.mocked(MobileWebMcpClient) as unknown as vi.Mock).mockImplementation(() => mockMcpClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an Evaluator instance with all dependencies', async () => {
      const evaluatorLlmClient = mockLlmClient;
      const componentLlmClient = mockLlmClient;

      const result = await Evaluator.create(evaluatorLlmClient, componentLlmClient);

      expect(result).toBeInstanceOf(Evaluator);
      expect(MobileWebMcpClient).toHaveBeenCalledTimes(1);
      expect(mockMcpClient.connect).toHaveBeenCalledTimes(1);
      expect(LwcGenerationEvaluator.create).toHaveBeenCalledWith(
        evaluatorLlmClient,
        componentLlmClient,
        mockMcpClient
      );
      expect(LwcReviewRefactorEvaluator).toHaveBeenCalledWith(
        evaluatorLlmClient,
        componentLlmClient,
        mockMcpClient
      );
    });

    it('should handle MCP client connection errors', async () => {
      const connectionError = new Error('Connection failed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockMcpClient.connect as any).mockRejectedValue(connectionError);

      const evaluatorLlmClient = mockLlmClient;
      const componentLlmClient = mockLlmClient;

      await expect(Evaluator.create(evaluatorLlmClient, componentLlmClient)).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('evaluate', () => {
    let mockEvaluationUnit: EvaluationUnit;

    beforeEach(() => {
      mockEvaluationUnit = {
        query: 'test query',
        component: {
          name: 'testComponent',
          namespace: 'c',
          html: [],
          js: [],
          css: [],
          jsMetaXml: {
            path: 'testComponent.js-meta.xml',
            content:
              '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
          },
        },
        config: {
          type: 'lwc-generation' as const,
          mcpTools: [
            {
              toolId: 'test-tool',
              params: { param1: 'value1' },
            },
          ],
        },
      };

      // Mock loadEvaluationUnit to return our mock evaluation unit
      vi.mocked(loadEvaluationUnit).mockResolvedValue(mockEvaluationUnit);

      evaluator = new Evaluator(
        mockGenerationEvaluator,
        mockReviewRefactorEvaluator,
        mockMcpClient
      );
    });

    it('should evaluate lwc-generation type components', async () => {
      const expectedScore: Score = {
        rawScore: 85,
        verdict: 'Pass GA Criteria',
      };

      (mockGenerationEvaluator.evaluate as vi.Mock).mockResolvedValue(expectedScore);

      const result = await evaluator.evaluate('testComponent');

      expect(loadEvaluationUnit).toHaveBeenCalledWith(join(EVAL_DATA_FOLDER, 'testComponent'));
      expect(mockGenerationEvaluator.evaluate).toHaveBeenCalledWith(mockEvaluationUnit);
      expect(mockReviewRefactorEvaluator.evaluate).not.toHaveBeenCalled();
      expect(result).toEqual(expectedScore);
    });

    it('should evaluate review-refactor type components', async () => {
      const reviewRefactorEvaluationUnit = {
        ...mockEvaluationUnit,
        config: {
          ...mockEvaluationUnit.config,
          type: 'review-refactor' as const,
        },
      };

      const expectedScore: CorrectnessScore = {
        rawScore: 90,
        verdict: 'Pass GA Criteria',
        scoreCategory: 'Excellent',
        failedIssues: [],
        incorrectOrUnauthorizedChanges: [],
      };

      vi.mocked(loadEvaluationUnit).mockResolvedValue(reviewRefactorEvaluationUnit);

      (mockReviewRefactorEvaluator.evaluate as vi.Mock).mockResolvedValue(expectedScore);

      const result = await evaluator.evaluate('testComponent');

      expect(loadEvaluationUnit).toHaveBeenCalledWith(join(EVAL_DATA_FOLDER, 'testComponent'));
      expect(mockReviewRefactorEvaluator.evaluate).toHaveBeenCalledWith(
        reviewRefactorEvaluationUnit
      );
      expect(mockGenerationEvaluator.evaluate).not.toHaveBeenCalled();
      expect(result).toEqual(expectedScore);
    });

    it('should throw error when evaluation unit is not found', async () => {
      vi.mocked(loadEvaluationUnit).mockResolvedValue(null);

      await expect(evaluator.evaluate('nonexistentComponent')).rejects.toThrow(
        'Evaluation unit not found for component nonexistentComponent'
      );

      expect(mockGenerationEvaluator.evaluate).not.toHaveBeenCalled();
      expect(mockReviewRefactorEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported evaluation type', async () => {
      const unsupportedEvaluationUnit = {
        ...mockEvaluationUnit,
        config: {
          ...mockEvaluationUnit.config,
          type: 'unsupported-type',
        },
      } as unknown as EvaluationUnit;

      vi.mocked(loadEvaluationUnit).mockResolvedValue(unsupportedEvaluationUnit);

      await expect(evaluator.evaluate('testComponent')).rejects.toThrow(
        'Unsupported evaluation type: unsupported-type'
      );

      expect(mockGenerationEvaluator.evaluate).not.toHaveBeenCalled();
      expect(mockReviewRefactorEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should propagate errors from generation evaluator', async () => {
      const evaluationError = new Error('Generation evaluation failed');

      (mockGenerationEvaluator.evaluate as vi.Mock).mockRejectedValue(evaluationError);

      await expect(evaluator.evaluate('testComponent')).rejects.toThrow(
        'Generation evaluation failed'
      );
    });

    it('should propagate errors from review-refactor evaluator', async () => {
      const reviewRefactorEvaluationUnit = {
        ...mockEvaluationUnit,
        config: {
          ...mockEvaluationUnit.config,
          type: 'review-refactor' as const,
        },
      };

      vi.mocked(loadEvaluationUnit).mockResolvedValue(reviewRefactorEvaluationUnit);

      const evaluationError = new Error('Review-refactor evaluation failed');

      (mockReviewRefactorEvaluator.evaluate as vi.Mock).mockRejectedValue(evaluationError);

      await expect(evaluator.evaluate('testComponent')).rejects.toThrow(
        'Review-refactor evaluation failed'
      );
    });
  });

  describe('integration scenarios', () => {
    let mockEvaluationUnit: EvaluationUnit;

    beforeEach(() => {
      evaluator = new Evaluator(
        mockGenerationEvaluator,
        mockReviewRefactorEvaluator,
        mockMcpClient
      );

      mockEvaluationUnit = {
        query: 'test query',
        component: {
          name: 'testComponent',
          namespace: 'c',
          html: [],
          js: [],
          css: [],
          jsMetaXml: {
            path: 'testComponent.js-meta.xml',
            content:
              '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
          },
        },
        config: {
          type: 'lwc-generation' as const,
          mcpTools: [
            {
              toolId: 'test-tool',
              params: { param1: 'value1' },
            },
          ],
        },
      };
    });

    it('should handle component names with special characters', async () => {
      const expectedScore: Score = {
        rawScore: 75,
        verdict: 'Pass GA Criteria',
      };

      (mockGenerationEvaluator.evaluate as vi.Mock).mockResolvedValue(expectedScore);
      vi.mocked(loadEvaluationUnit).mockResolvedValue(mockEvaluationUnit);

      const result = await evaluator.evaluate('component-with-dashes');

      expect(loadEvaluationUnit).toHaveBeenCalledWith(
        join(EVAL_DATA_FOLDER, 'component-with-dashes')
      );
      expect(result).toEqual(expectedScore);
    });

    it('should handle empty component name', async () => {
      vi.mocked(loadEvaluationUnit).mockResolvedValue(null);

      await expect(evaluator.evaluate('')).rejects.toThrow(
        'Evaluation unit not found for component '
      );
    });
  });
});
