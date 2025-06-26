/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import LwcComponentAgent from '../../src/evaluation/lwcComponentAgent.js';
import { ModelConfig } from '../../src/llmclient/modelConfig.js';

describe('LwcComponentAgent', () => {
  let componentAgent: LwcComponentAgent;
  const mockConfig: ModelConfig = {
    model: 'test-model',
    provider: 'test-provider',
    apiKey: 'test-api-key',
    baseUrl: 'https://test-api.com',
    clientFeatureID: 'test-feature',
    tenantId: 'test-tenant',
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateLwcComponent', () => {
    it('should generate a valid LWC component with all required files', async () => {
      vi.spyOn(LlmClient.prototype, 'callLLM').mockResolvedValue(`
        component.html
        \`\`\`html
        <template></template>
        \`\`\`

        component.js
        \`\`\`javascript
        const a = 1;
        \`\`\`
      `);

      componentAgent = new LwcComponentAgent(new LlmClient(mockConfig));

      const result = await componentAgent.generateLwcComponent('Create a test component');

      expect(result.files).toHaveLength(2);
      expect(result.files[0].content).toBe('<template></template>');
      expect(result.files[1].content).toBe('const a = 1;');
    });

    it('should throw error when no component is found in response', async () => {
      vi.spyOn(LlmClient.prototype, 'callLLM').mockResolvedValue(``);

      componentAgent = new LwcComponentAgent(new LlmClient(mockConfig));

      await expect(componentAgent.generateLwcComponent('Create a test component')).rejects.toThrow(
        'No html code block found in the response'
      );
    });

    it('should throw error when no component is found in response', async () => {
      vi.spyOn(LlmClient.prototype, 'callLLM').mockResolvedValue(`
        component.html
        \`\`\`html
        <template></template>
        \`\`\`
      `);

      componentAgent = new LwcComponentAgent(new LlmClient(mockConfig));

      await expect(componentAgent.generateLwcComponent('Create a test component')).rejects.toThrow(
        'No js code block found in the response'
      );
    });
  });
});
