/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    let evaluator: Evaluator;

    beforeEach(async () => {
      evaluator = await Evaluator.create();
    });
    afterEach(async () => {
      if (evaluator) {
        evaluator.destroy();
      }
    });

    it(`exception thrown for no existing component name`, async () => {
      await expect(evaluator.evaluate('nonexistent')).rejects.toThrow(
        'Evaluation unit not found for component nonexistent'
      );
    });

    it(`evaluation succeeds`, async () => {
      const generateLwcComponentSpy = vi
        .spyOn(LwcComponentAgent.prototype, 'generateLwcComponent')
        .mockResolvedValue({
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

      const score = await evaluator.evaluate('mobile-web/qrCodeOnlyScanner');
      expect(score).toBe('Pass GA Criteria');

      // Verify generateLwcComponent was called with expected parameters
      expect(generateLwcComponentSpy).toHaveBeenCalledTimes(1);
      expect(generateLwcComponentSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Develop a Lightning Web Component (LWC) for an Android smartphone'
        ), // userPrompt should contain the actual prompt
        expect.stringContaining('Barcode Scanner Service Grounding Context') // mcpGroundings parameter
      );
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

      const score = await evaluator.evaluate('mobile-web/qrCodeOnlyScanner');
      expect(score).toBe('FAIL');
    });
  });
});
