/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Evaluator } from '../../src/evaluation/evaluator.js';
import LwcEvaluatorAgent from '../../src/evaluation/lwcEvaluatorAgent.js';
import LwcComponentAgent from '../../src/evaluation/lwcComponentAgent.js';
import { LWCFileType } from '../../src/utils/lwcUtils.js';

describe('evaluator tests', () => {
  beforeEach(() => {
    // mock environment variables
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
  });

  describe('evaluate tests', () => {
    it(`exception thrown for no existing component name`, async () => {
      const evaluator = new Evaluator();
      await expect(evaluator.evaluate('nonexistent')).rejects.toThrow(
        'Training unit not found for component nonexistent'
      );
    });

    it(`evaluation succeeds`, async () => {
      vi.spyOn(LwcComponentAgent.prototype, 'generateLwcComponent').mockResolvedValue({
        files: [
          {
            name: 'test.html',
            type: LWCFileType.HTML,
            content: '<template>Test</template>',
          },
          {
            name: 'test.js',
            type: LWCFileType.JS,
            content: 'console.log("Test");',
          },
        ],
      });

      vi.spyOn(LwcEvaluatorAgent.prototype, 'evaluate').mockResolvedValue('Pass GA Criteria');

      const evaluator = new Evaluator();
      const score = await evaluator.evaluate('mobile-web/qrCodeOnlyScanner');
      expect(score).toBe('Pass GA Criteria');
    });

    it(`evaluation fails`, async () => {
      vi.spyOn(LwcComponentAgent.prototype, 'generateLwcComponent').mockResolvedValue({
        files: [
          {
            name: 'test.html',
            type: LWCFileType.HTML,
            content: '<template>Test</template>',
          },
          {
            name: 'test.js',
            type: LWCFileType.JS,
            content: 'console.log("Test");',
          },
        ],
      });

      vi.spyOn(LwcEvaluatorAgent.prototype, 'evaluate').mockResolvedValue('FAIL');

      const evaluator = new Evaluator();
      const score = await evaluator.evaluate('mobile-web/qrCodeOnlyScanner');
      expect(score).toBe('FAIL');
    });
  });
});
