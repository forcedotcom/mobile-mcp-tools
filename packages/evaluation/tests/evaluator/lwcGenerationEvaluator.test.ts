/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EVAL_DATA_FOLDER,
  LwcGenerationEvaluator,
} from '../../src/evaluator/lwcGenerationEvaluator.js';
import { LwcEvaluatorAgent } from '../../src/agent/lwcEvaluatorAgent.js';
import LwcComponentAgent from '../../src/agent/lwcComponentAgent.js';
import { loadEvaluationUnit, EvaluationUnit } from '../../src/utils/lwcUtils.js';
import {
  createEvaluatorLlmClient,
  createComponentLlmClient,
} from '../../src/llmclient/llmClient.js';
import { join } from 'path';
import { MobileWebMcpClient } from '../../src/mcpclient/mobileWebMcpClient.js';

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

  // Skipped because mobile-web package has been removed
  describe.skip('evaluate tests', () => {
    let evaluator: LwcGenerationEvaluator;

    beforeEach(async () => {
      const evaluatorLlmClient = createEvaluatorLlmClient();
      const componentLlmClient = createComponentLlmClient();
      const mockMcpClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        callTool: vi.fn().mockResolvedValue({ content: [{ text: 'mock grounding' }] }),
      } as unknown as MobileWebMcpClient;
      evaluator = await LwcGenerationEvaluator.create(
        evaluatorLlmClient,
        componentLlmClient,
        mockMcpClient
      );
    });
    afterEach(async () => {
      if (evaluator) {
        await evaluator.destroy();
      }
    });

    it(`exception thrown for no existing component name`, async () => {
      // Create a mock evaluation unit with undefined config to test error handling
      const mockEvaluationUnit = {
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
        config: undefined,
      } as unknown as EvaluationUnit;

      await expect(evaluator.evaluate(mockEvaluationUnit)).rejects.toThrow(
        "Cannot read properties of undefined (reading 'mcpTools')"
      );
    });

    it(`evaluation succeeds`, async () => {
      const generateLwcComponentSpy = vi
        .spyOn(LwcComponentAgent.prototype, 'generateLwcComponent')
        .mockResolvedValue({
          name: 'test',
          namespace: 'c',
          html: [
            {
              path: 'test.html',
              content: '<template>Test</template>',
            },
          ],
          js: [
            {
              path: 'test.js',
              content: 'console.log("Test");',
            },
          ],
          css: [],
          jsMetaXml: {
            path: 'test.js-meta.xml',
            content:
              '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
          },
        });

      vi.spyOn(LwcEvaluatorAgent.prototype, 'evaluate').mockResolvedValue({
        rawScore: 85,
        verdict: 'Pass GA Criteria',
      });

      const mockEvaluationUnit = await loadEvaluationUnit(
        join(EVAL_DATA_FOLDER, 'mobile-web/qrCodeOnlyScanner')
      );
      if (!mockEvaluationUnit) throw new Error('mockEvaluationUnit is null');
      const score = await evaluator.evaluate(mockEvaluationUnit);
      expect(score).toEqual({ rawScore: 85, verdict: 'Pass GA Criteria' });

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
        name: 'test',
        namespace: 'c',
        html: [
          {
            path: 'test.html',
            content: '<template>Test</template>',
          },
        ],
        js: [
          {
            path: 'test.js',
            content: 'console.log("Test");',
          },
        ],
        css: [],
        jsMetaXml: {
          path: 'test.js-meta.xml',
          content:
            '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
        },
      });

      (vi.spyOn(LwcEvaluatorAgent.prototype, 'evaluate') as vi.Mock).mockResolvedValue({
        rawScore: 30,
        verdict: 'FAIL',
      });

      const mockEvaluationUnit = await loadEvaluationUnit(
        join(EVAL_DATA_FOLDER, 'mobile-web/qrCodeOnlyScanner')
      );
      if (!mockEvaluationUnit) throw new Error('mockEvaluationUnit is null');
      const score = await evaluator.evaluate(mockEvaluationUnit);
      expect(score).toEqual({ rawScore: 30, verdict: 'FAIL' });
    });
  });
});
