/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { LwcComponentAgent } from '../../src/agent/lwcComponentAgent.js';
import { mockConfig } from '../testUtils.js';

describe('LwcComponentAgent', () => {
  let componentAgent: LwcComponentAgent;

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

        component.js-meta.xml
        \`\`\`xml
        <?xml version="1.0" encoding="UTF-8"?>
        <LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
        </LightningComponentBundle>
        \`\`\`
      `);

      componentAgent = new LwcComponentAgent(new LlmClient(mockConfig));

      const result = await componentAgent.generateLwcComponent('Create a test component');

      expect(result.name).toBe('component');
      expect(result.namespace).toBe('c');
      expect(result.html).toHaveLength(1);
      expect(result.js).toHaveLength(1);
      expect(result.css).toHaveLength(0);
      expect(result.html![0].content).toBe('<template></template>');
      expect(result.js![0].content).toBe('const a = 1;');
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
